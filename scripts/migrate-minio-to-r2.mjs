import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const source = new S3Client({
  region: "us-east-1",
  endpoint: `${process.env.SOURCE_USE_SSL === "true" ? "https" : "http"}://${process.env.SOURCE_ENDPOINT}:${process.env.SOURCE_PORT}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SOURCE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.SOURCE_SECRET_KEY ?? "",
  },
});

const sourceBucket = process.env.SOURCE_BUCKET ?? "photography";
const targetBucket = process.env.TARGET_BUCKET ?? "photography";
const limit = Number(process.env.MIGRATION_LIMIT ?? "0");
const requestedKeys = new Set((process.env.MIGRATION_KEYS ?? "").split(",").map((key) => key.trim()).filter(Boolean));
const concurrency = Math.max(1, Number(process.env.MIGRATION_CONCURRENCY ?? "3"));
const wranglerEntry = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");

function contentTypeFor(key) {
  const ext = path.extname(key).toLowerCase();
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
  }[ext] ?? "application/octet-stream";
}

async function listObjects() {
  const objects = [];
  let continuationToken;
  do {
    const result = await source.send(new ListObjectsV2Command({
      Bucket: sourceBucket,
      ContinuationToken: continuationToken,
    }));
    for (const object of result.Contents ?? []) {
      if (object.Key && object.Size !== undefined) objects.push({ key: object.Key, size: object.Size });
    }
    continuationToken = result.NextContinuationToken;
  } while (continuationToken);
  if (requestedKeys.size) return objects.filter(({ key }) => requestedKeys.has(key));
  return limit > 0 ? objects.slice(0, limit) : objects;
}

async function uploadObject(object) {
  const result = await source.send(new GetObjectCommand({ Bucket: sourceBucket, Key: object.key }));
  const body = result.Body;
  if (!body) throw new Error(`Source object has no body: ${object.key}`);
  const bytes = Buffer.from(await body.transformToByteArray());
  const child = spawn(process.execPath, [wranglerEntry,
    "r2", "object", "put", `${targetBucket}/${object.key}`,
    "--remote", "--pipe", "--content-type", contentTypeFor(object.key),
  ], { stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(bytes);
  const [code] = await once(child, "close");
  if (code !== 0) {
    const stderr = child.stderr.read()?.toString() ?? "unknown Wrangler error";
    throw new Error(`${object.key}: ${stderr.trim()}`);
  }
}

const objects = await listObjects();
console.log(`Migrating ${objects.length} objects (${objects.reduce((sum, object) => sum + object.size, 0)} bytes) with concurrency ${concurrency}`);

let nextIndex = 0;
let completed = 0;
const failures = [];

async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= objects.length) return;
    const object = objects[index];
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await uploadObject(object);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    if (lastError) failures.push({ key: object.key, error: String(lastError) });
    completed += 1;
    console.log(`[${completed}/${objects.length}] ${object.key}${lastError ? " FAILED" : " OK"}`);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, objects.length) }, () => worker()));
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log("Migration complete");
}

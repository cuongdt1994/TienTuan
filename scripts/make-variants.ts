import { spawn } from "node:child_process";
import { once } from "node:events";
import { unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

type ImageRow = { id: string; originalUrl: string; width: number; height: number };
type WranglerResult = { results?: ImageRow[] };

const accountId = process.env.R2_ACCOUNT_ID ?? "7548e7178cc0fccea6d8373c4a050eef";
const bucket = process.env.R2_BUCKET ?? "photography";
const publicBase = (process.env.PUBLIC_IMAGE_BASE_URL ?? "https://media.tientuanphoto.com").replace(/\/$/, "");
const widths = [640, 1280, 1920, 2560, 3200] as const;
const formats = ["avif", "webp", "jpg"] as const;
const wranglerEntry = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));

const s3 = process.env.R2_S3_ACCESS_KEY_ID && process.env.R2_S3_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_S3_ACCESS_KEY_ID, secretAccessKey: process.env.R2_S3_SECRET_ACCESS_KEY },
    })
  : null;

function originalKey(value: string) {
  if (value.startsWith("r2://")) return decodeURIComponent(new URL(value).pathname.slice(1));
  const parsed = new URL(value);
  const marker = "/originals/";
  const index = parsed.pathname.indexOf(marker);
  if (index < 0) throw new Error(`Cannot resolve original object key: ${value}`);
  return decodeURIComponent(parsed.pathname.slice(index + 1));
}

async function listImages() {
  const child = spawn(process.execPath, [wranglerEntry, "d1", "execute", "atelier-portfolio-db", "--remote", "--json", "--command", "SELECT id, originalUrl, width, height FROM Image WHERE deletedAt IS NULL ORDER BY createdAt ASC"], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [code] = await once(child, "close");
  if (code !== 0) throw new Error((stderr || "Could not list D1 images").trim());
  const payload = JSON.parse(stdout || "[]") as WranglerResult[];
  return Array.isArray(payload) ? payload.flatMap((item) => item.results ?? []) : [];
}

async function downloadOriginal(key: string) {
  if (s3) {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body) throw new Error(`Missing R2 object: ${key}`);
    return Buffer.from(await object.Body.transformToByteArray());
  }
  const response = await fetch(`${publicBase}/${key}`);
  if (!response.ok) throw new Error(`Could not download ${key}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function hasCompleteVariantSet(imageId: string) {
  try {
    const response = await fetch(`${publicBase}/variants/${imageId}/3200.avif`, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function putVariant(key: string, bytes: Buffer, contentType: string) {
  const child = spawn(process.execPath, [wranglerEntry, "r2", "object", "put", `${bucket}/${key}`, "--remote", "--pipe", "--content-type", contentType], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(bytes);
  const [code] = await once(child, "close");
  if (code !== 0) throw new Error(`${key}: ${(stderr || "R2 upload failed").trim()}`);
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function updateD1(updates: string[]) {
  if (!updates.length) return;
  const sql = updates.join("\n");
  const sqlPath = fileURLToPath(new URL(`.variant-migration-${Date.now()}.sql`, import.meta.url));
  await writeFile(sqlPath, sql, "utf8");
  const child = spawn(process.execPath, [wranglerEntry, "d1", "execute", "atelier-portfolio-db", "--remote", "--file", sqlPath], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    const [code] = await once(child, "close");
    if (code !== 0) throw new Error((stderr || "D1 update failed").trim());
  } finally {
    await unlink(sqlPath).catch(() => undefined);
  }
}

const images = await listImages();
const limit = Number(process.env.VARIANT_LIMIT ?? "0");
const selected = limit > 0 ? images.slice(0, limit) : images;
const updates: string[] = [];
console.log(`Generating ${formats.length} formats × ${widths.length} widths for ${selected.length} images locally`);

async function processImage(image: ImageRow, index: number) {
  const sourceKey = originalKey(image.originalUrl);
  if (await hasCompleteVariantSet(image.id)) {
    updates.push(`UPDATE Image SET originalUrl = ${sqlString(`r2://${bucket}/${sourceKey}`)}, largeUrl = ${sqlString(`/img/${image.id}?w=1920`)}, mediumUrl = ${sqlString(`/img/${image.id}?w=1280`)}, thumbnailUrl = ${sqlString(`/img/${image.id}?w=640`)} WHERE id = ${sqlString(image.id)};`);
    console.log(`[${index + 1}/${selected.length}] ${image.id} already complete`);
    return;
  }
  const original = await downloadOriginal(sourceKey);
  const base = sharp(original, { limitInputPixels: 100_000_000 }).rotate().pipelineColourspace("srgb").toColourspace("srgb");
  for (const width of widths) {
    const resized = base.clone().resize({ width, fit: "inside", withoutEnlargement: true });
    const outputs: Array<{ extension: string; contentType: string; bytes: Buffer }> = [
      { extension: "avif", contentType: "image/avif", bytes: await resized.clone().avif({ quality: 73, effort: 1 }).toBuffer() },
      { extension: "webp", contentType: "image/webp", bytes: await resized.clone().webp({ quality: 88 }).toBuffer() },
      { extension: "jpg", contentType: "image/jpeg", bytes: await resized.clone().jpeg({ quality: 90 }).toBuffer() },
    ];
    // R2 uploads are independent; keep the local pipeline busy without ever
    // moving the source image or variant bytes through the Worker.
    await Promise.all(outputs.map((output) => putVariant(`variants/${image.id}/${width}.${output.extension}`, output.bytes, output.contentType)));
  }
  updates.push(`UPDATE Image SET originalUrl = ${sqlString(`r2://${bucket}/${sourceKey}`)}, largeUrl = ${sqlString(`/img/${image.id}?w=1920`)}, mediumUrl = ${sqlString(`/img/${image.id}?w=1280`)}, thumbnailUrl = ${sqlString(`/img/${image.id}?w=640`)} WHERE id = ${sqlString(image.id)};`);
  console.log(`[${index + 1}/${selected.length}] ${image.id} ready`);
}

const concurrency = Math.max(1, Math.min(4, Number(process.env.VARIANT_CONCURRENCY ?? "4")));
let nextIndex = 0;
async function worker() {
  while (nextIndex < selected.length) {
    const index = nextIndex++;
    await processImage(selected[index], index);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()));

await updateD1(updates);
console.log("Variant generation and D1 URL migration complete");

import "server-only";
import type { Readable } from "node:stream";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

type R2Body = {
  transformToByteArray: () => Promise<Uint8Array>;
  transformToWebStream: () => ReadableStream;
};

type R2ObjectLike = {
  body?: ReadableStream | null;
  size?: number;
  etag?: string;
  httpMetadata?: { contentType?: string };
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type R2BucketLike = {
  head: (key: string) => Promise<R2ObjectLike | null>;
  get: (key: string) => Promise<R2ObjectLike | null>;
  put: (key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
  delete: (keys: string | string[]) => Promise<void>;
};

type StorageObject = {
  Body?: R2Body;
  ContentLength?: number;
  ContentType?: string;
  ETag?: string;
};

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
});

async function r2Bucket() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as { PHOTOGRAPHY_R2?: R2BucketLike }).PHOTOGRAPHY_R2 ?? null;
  } catch {
    return null;
  }
}

function r2Object(object: R2ObjectLike): StorageObject {
  return {
    Body: object.body ? {
      transformToByteArray: async () => new Uint8Array(await object.arrayBuffer()),
      transformToWebStream: () => object.body as ReadableStream,
    } : undefined,
    ContentLength: object.size,
    ContentType: object.httpMetadata?.contentType,
    ETag: object.etag,
  };
}

async function toBuffer(body: Buffer | Readable) {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function ensureBucket() {
  const bucket = await r2Bucket();
  if (bucket) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
  }
}

export function objectUrl(key: string) {
  if (env.PUBLIC_IMAGE_BASE_URL) return `${env.PUBLIC_IMAGE_BASE_URL.replace(/\/$/, "")}/${key}`;
  return `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${key}`;
}

export async function readObject(key: string): Promise<StorageObject> {
  const bucket = await r2Bucket();
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return {};
    return r2Object(object);
  }
  return s3.send(new GetObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key })) as Promise<StorageObject>;
}

export async function putObject(key: string, body: Buffer | Readable, contentType: string, size?: number) {
  const bucket = await r2Bucket();
  if (bucket) {
    await bucket.put(key, await toBuffer(body), {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });
    return objectUrl(key);
  }
  await s3.send(new PutObjectCommand({
    Bucket: env.MINIO_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(size ? { ContentLength: size } : {}),
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return objectUrl(key);
}

export function objectKeyFromUrl(value: string) {
  try {
    const parsed = new URL(value);
    const publicBase = env.PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
    if (publicBase && value.startsWith(`${publicBase}/`)) return decodeURIComponent(parsed.pathname.slice(1));
    if (parsed.pathname.startsWith("/media/")) return decodeURIComponent(parsed.pathname.slice("/media/".length));
    const prefix = `/${env.MINIO_BUCKET}/`;
    const start = parsed.pathname.indexOf(prefix);
    return start === -1 ? null : decodeURIComponent(parsed.pathname.slice(start + prefix.length));
  } catch {
    return null;
  }
}

export async function deleteObjectUrls(urls: string[]) {
  const keys = [...new Set(urls.map(objectKeyFromUrl).filter((key): key is string => Boolean(key)))];
  if (!keys.length) return;
  const bucket = await r2Bucket();
  if (bucket) {
    for (let index = 0; index < keys.length; index += 1000) await bucket.delete(keys.slice(index, index + 1000));
    return;
  }
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    const result = await s3.send(new DeleteObjectsCommand({ Bucket: env.MINIO_BUCKET, Delete: { Objects: chunk.map((Key) => ({ Key })) } }));
    if (result.Errors?.length) throw new Error(`Could not delete ${result.Errors.length} image objects`);
  }
}

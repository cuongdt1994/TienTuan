import "server-only";
import type { Readable } from "node:stream";
import { CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
});

export async function ensureBucket() {
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

export async function readObject(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key }));
}

export async function putObject(key: string, body: Buffer | Readable, contentType: string, size?: number) {
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
    const pathname = new URL(value).pathname;
    const prefix = `/${env.MINIO_BUCKET}/`;
    const start = pathname.indexOf(prefix);
    return start === -1 ? null : decodeURIComponent(pathname.slice(start + prefix.length));
  } catch {
    return null;
  }
}

export async function deleteObjectUrls(urls: string[]) {
  const keys = [...new Set(urls.map(objectKeyFromUrl).filter((key): key is string => Boolean(key)))];
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    const result = await s3.send(new DeleteObjectsCommand({ Bucket: env.MINIO_BUCKET, Delete: { Objects: chunk.map((Key) => ({ Key })) } }));
    if (result.Errors?.length) throw new Error(`Could not delete ${result.Errors.length} image objects`);
  }
}

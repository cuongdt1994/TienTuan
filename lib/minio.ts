import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

type R2Body = {
  transformToWebStream: () => ReadableStream;
};

type R2ObjectLike = {
  body?: ReadableStream | null;
  size?: number;
  etag?: string;
  httpMetadata?: { contentType?: string };
};

type R2BucketLike = {
  head: (key: string) => Promise<R2ObjectLike | null>;
  get: (key: string) => Promise<R2ObjectLike | null>;
  put: (key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
  list: (options?: { prefix?: string; cursor?: string; limit?: number }) => Promise<{ objects: Array<{ key: string }>; truncated?: boolean; cursor?: string }>;
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
      transformToWebStream: () => object.body as ReadableStream,
    } : undefined,
    ContentLength: object.size,
    ContentType: object.httpMetadata?.contentType,
    ETag: object.etag,
  };
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

export function privateObjectRef(key: string) {
  return `r2://${env.MINIO_BUCKET}/${key}`;
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

export async function headObject(key: string): Promise<Pick<StorageObject, "ContentLength" | "ContentType" | "ETag">> {
  const bucket = await r2Bucket();
  if (bucket) {
    const object = await bucket.head(key);
    return object ? { ContentLength: object.size, ContentType: object.httpMetadata?.contentType, ETag: object.etag } : {};
  }
  return s3.send(new HeadObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key })) as Promise<Pick<StorageObject, "ContentLength" | "ContentType" | "ETag">>;
}

export function objectKeyFromUrl(value: string) {
  try {
    if (value.startsWith("r2://")) {
      const parsed = new URL(value);
      return decodeURIComponent(parsed.pathname.slice(1));
    }
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

/** Remove all prepared variants for an image after its D1 row is deleted. */
export async function deleteVariantObjects(imageIds: string[]) {
  const prefixes = [...new Set(imageIds.filter((id) => /^[A-Za-z0-9_-]{12,80}$/.test(id)).map((id) => `variants/${id}/`))];
  const manifests = [...new Set(imageIds.filter((id) => /^[A-Za-z0-9_-]{12,80}$/.test(id)).map((id) => `image-sources/${id}.json`))];
  if (!prefixes.length && !manifests.length) return;
  const bucket = await r2Bucket();
  if (bucket) {
    for (const prefix of prefixes) {
      let cursor: string | undefined;
      do {
        const page = await bucket.list({ prefix, cursor, limit: 1000 });
        const keys = page.objects.map((object) => object.key);
        if (keys.length) await bucket.delete(keys);
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
    }
    if (manifests.length) await bucket.delete(manifests);
    return;
  }
  for (const prefix of prefixes) {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: env.MINIO_BUCKET, Prefix: prefix }));
    const keys = (page.Contents ?? []).map((object) => object.Key).filter((key): key is string => Boolean(key));
    if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: env.MINIO_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
  }
  if (manifests.length) await s3.send(new DeleteObjectsCommand({ Bucket: env.MINIO_BUCKET, Delete: { Objects: manifests.map((Key) => ({ Key })) } }));
}

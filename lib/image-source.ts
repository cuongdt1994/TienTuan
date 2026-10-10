import { getCloudflareContext } from "@opennextjs/cloudflare";

export const imageSourceManifestKey = (imageId: string) => `image-sources/${imageId}.json`;

export type ImageSourceManifest = {
  objectKey: string;
  contentType: string;
  size: number;
};

type SourceObject = {
  body?: ReadableStream<Uint8Array> | null;
  size?: number;
  httpMetadata?: { contentType?: string };
};

export type ImageSourceBucket = {
  get: (key: string) => Promise<SourceObject | null>;
  put: (key: string, value: string | ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
};

type ImageSourceReadBucket = Pick<ImageSourceBucket, "get">;

export async function imageSourceBucket() {
  const context = await getCloudflareContext({ async: true });
  return (context.env as { PHOTOGRAPHY_R2?: ImageSourceBucket }).PHOTOGRAPHY_R2 ?? null;
}

export async function writeImageSourceManifest(imageId: string, manifest: ImageSourceManifest) {
  const bucket = await imageSourceBucket();
  if (!bucket) throw new Error("Photography R2 binding is unavailable");
  await bucket.put(imageSourceManifestKey(imageId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" },
  });
}

export async function readImageSourceManifest(bucket: ImageSourceReadBucket, imageId: string) {
  const object = await bucket.get(imageSourceManifestKey(imageId));
  if (!object?.body) return null;
  try {
    const value = await new Response(object.body).json() as Partial<ImageSourceManifest>;
    if (typeof value.objectKey !== "string" || !/^originals\/[A-Za-z0-9_-]{20,}-[A-Za-z0-9._-]{1,180}$/.test(value.objectKey)) return null;
    return {
      objectKey: value.objectKey,
      contentType: typeof value.contentType === "string" ? value.contentType : "image/jpeg",
      size: typeof value.size === "number" ? value.size : 0,
    } satisfies ImageSourceManifest;
  } catch {
    return null;
  }
}

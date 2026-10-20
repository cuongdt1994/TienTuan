import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AwsClient } from "aws4fetch";
import { nearestVariantWidth, preferredVariantFormat, variantContentType, variantKey } from "@/lib/image-variants";
import { readImageSourceManifest } from "@/lib/image-source";
import { createImageSourceToken } from "@/lib/image-source-auth";

export const dynamic = "force-dynamic";

const imageId = /^[A-Za-z0-9_-]{12,80}$/;
type BucketLike = { get: (key: string) => Promise<{ body?: ReadableStream<Uint8Array>; size?: number; etag?: string; httpEtag?: string; httpMetadata?: { contentType?: string } } | null> };

type TransformFetchInit = RequestInit & {
  cf?: { image: { width: number; fit: "scale-down"; format: "avif" | "webp" | "jpeg"; quality: number } };
};

type VariantBucket = BucketLike & {
  put: (key: string, value: ArrayBuffer | ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
};

const IMAGE_CACHE_VERSION = "6";

function outputContentType(value: string | null, fallback: string) {
  return value === "image/avif" || value === "image/webp" || value === "image/jpeg" ? value : fallback;
}

function detectedContentType(body: ArrayBuffer, fallback: string) {
  const bytes = new Uint8Array(body);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return fallback;
}

function cacheKey(request: Request, width: number, format: string) {
  const url = new URL(request.url);
  url.search = `?w=${width}&f=${format}&v=${IMAGE_CACHE_VERSION}`;
  return new Request(url.toString(), { method: "GET" });
}

function notModified(etag: string | null, request: Request) {
  return Boolean(etag && request.headers.get("if-none-match") === etag);
}

async function signedR2SourceUrl(objectKey: string) {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.MINIO_BUCKET?.trim() || "photography";
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`);
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }).sign(
    new Request(url, { method: "GET" }),
    { aws: { signQuery: true } },
  );
  return signed.url.toString();
}

async function generateMissingVariant(request: Request, id: string, width: number, format: string, bucket: VariantBucket, context: { ctx: { waitUntil: (promise: Promise<unknown>) => void } }) {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return null;
  const manifest = await readImageSourceManifest(bucket, id);
  if (!manifest) return null;
  const sourceUrlObject = new URL(`/img/source/${encodeURIComponent(id)}`, request.url);
  const sourceToken = await createImageSourceToken(id, secret);
  sourceUrlObject.searchParams.set("token", sourceToken);
  const sourceUrl = await signedR2SourceUrl(manifest.objectKey) ?? sourceUrlObject.toString();
  let transformed: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const candidate = await fetch(sourceUrl, {
        headers: sourceUrl === sourceUrlObject.toString() ? { "x-image-source-token": sourceToken } : undefined,
        cf: {
          image: {
            width,
            fit: "scale-down",
            format: format as "avif" | "webp" | "jpeg",
            quality: format === "avif" ? 73 : format === "webp" ? 88 : 90,
          },
        },
      } as TransformFetchInit);
      if (candidate.ok && candidate.body) {
        transformed = candidate;
        break;
      }
    } catch {
      // A transient R2/Image Transform failure is retried below.
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)));
  }
  if (!transformed?.body) return null;
  const body = await transformed.arrayBuffer();
  const contentType = detectedContentType(body, outputContentType(transformed.headers.get("content-type"), variantContentType(format as "avif" | "webp" | "jpeg")));
  const responseHeaders = new Headers(transformed.headers);
  responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
  responseHeaders.set("Content-Disposition", "inline");
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Vary", "Accept");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Content-Length", String(body.byteLength));
  const response = new Response(body.slice(0), { headers: responseHeaders });
  context.ctx.waitUntil(bucket.put(variantKey(id, width as 640 | 1280 | 1920 | 2560 | 3200, format as "avif" | "webp" | "jpeg"), body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  }));
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!imageId.test(id)) return new Response("Not found", { status: 404 });

  const width = nearestVariantWidth(new URL(request.url).searchParams.get("w"));
  const format = preferredVariantFormat(request.headers.get("accept"));
  const key = variantKey(id, width, format);
  const responseHeaders = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "Vary": "Accept",
    "X-Content-Type-Options": "nosniff",
  });

  try {
    const context = await getCloudflareContext({ async: true });
    const bucket = context.env.PHOTOGRAPHY_R2 as BucketLike | undefined;
    if (!bucket) return new Response("Media storage unavailable", { status: 503 });

    const requestCacheKey = cacheKey(request, width, format);
    const cacheStorage = (globalThis as typeof globalThis & { caches?: { default?: Cache } }).caches;
    const cache = cacheStorage?.default ?? null;
    const cached = cache ? await cache.match(requestCacheKey) : undefined;
    if (cached) {
      const etag = cached.headers.get("ETag");
      if (notModified(etag, request)) return new Response(null, { status: 304, headers: { ETag: etag!, "Cache-Control": responseHeaders.get("Cache-Control")! } });
      return cached;
    }

    // R2 returns a ReadableStream. Never call arrayBuffer/blob here: this is
    // the hot path for public images and must stay stream-only.
    let servedFormat = format;
    let object = await bucket.get(key);
    if (!object && format !== "webp") {
      servedFormat = "webp";
      object = await bucket.get(variantKey(id, width, "webp"));
    }
    if (!object?.body) {
      const generated = await generateMissingVariant(request, id, width, servedFormat, bucket as VariantBucket, { ctx: context.ctx as { waitUntil: (promise: Promise<unknown>) => void } });
      if (generated) {
        if (cache) context.ctx.waitUntil(cache.put(requestCacheKey, generated.clone()));
        return generated;
      }
      return new Response("Image variant not found", { status: 404 });
    }

    const etag = object.httpEtag ?? object.etag ?? null;
    if (etag) responseHeaders.set("ETag", etag);
    responseHeaders.set("Content-Type", object.httpMetadata?.contentType ?? variantContentType(servedFormat));
    if (typeof object.size === "number") responseHeaders.set("Content-Length", String(object.size));
    if (notModified(etag, request)) return new Response(null, { status: 304, headers: responseHeaders });

    const response = new Response(object.body, { headers: responseHeaders });
    if (cache) context.ctx.waitUntil(cache.put(requestCacheKey, response.clone()));
    return response;
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}

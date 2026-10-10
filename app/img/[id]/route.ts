import { getCloudflareContext } from "@opennextjs/cloudflare";
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
  put: (key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
};

function cacheKey(request: Request, width: number, format: string) {
  const url = new URL(request.url);
  url.search = `?w=${width}&f=${format}`;
  return new Request(url.toString(), { method: "GET" });
}

function notModified(etag: string | null, request: Request) {
  return Boolean(etag && request.headers.get("if-none-match") === etag);
}

async function generateMissingVariant(request: Request, id: string, width: number, format: string, bucket: VariantBucket, context: { ctx: { waitUntil: (promise: Promise<unknown>) => void } }) {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return null;
  const manifest = await readImageSourceManifest(bucket, id);
  if (!manifest) return null;
  const sourceUrl = new URL(`/img/source/${encodeURIComponent(id)}`, request.url).toString();
  const transformed = await fetch(sourceUrl, {
    headers: { "x-image-source-token": await createImageSourceToken(id, secret) },
    cf: {
      image: {
        width,
        fit: "scale-down",
        format: format as "avif" | "webp" | "jpeg",
        quality: format === "avif" ? 73 : format === "webp" ? 88 : 90,
      },
    },
  } as TransformFetchInit);
  if (!transformed.ok || !transformed.body) return null;
  const responseHeaders = new Headers(transformed.headers);
  responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
  responseHeaders.set("Content-Disposition", "inline");
  responseHeaders.set("Content-Type", variantContentType(format as "avif" | "webp" | "jpeg"));
  responseHeaders.set("Vary", "Accept");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  const response = new Response(transformed.clone().body, { headers: responseHeaders });
  context.ctx.waitUntil(bucket.put(variantKey(id, width as 640 | 1280 | 1920 | 2560 | 3200, format as "avif" | "webp" | "jpeg"), transformed.body, {
    httpMetadata: { contentType: variantContentType(format as "avif" | "webp" | "jpeg"), cacheControl: "public, max-age=31536000, immutable" },
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

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { nearestVariantWidth, preferredVariantFormat, variantContentType, variantKey } from "@/lib/image-variants";

export const dynamic = "force-dynamic";

const imageId = /^[A-Za-z0-9_-]{12,80}$/;
type BucketLike = { get: (key: string) => Promise<{ body?: ReadableStream<Uint8Array>; size?: number; etag?: string; httpEtag?: string; httpMetadata?: { contentType?: string } } | null> };

function cacheKey(request: Request, width: number, format: string) {
  const url = new URL(request.url);
  url.search = `?w=${width}&f=${format}`;
  return new Request(url.toString(), { method: "GET" });
}

function notModified(etag: string | null, request: Request) {
  return Boolean(etag && request.headers.get("if-none-match") === etag);
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
    if (!object?.body) return new Response("Image variant not found", { status: 404 });

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

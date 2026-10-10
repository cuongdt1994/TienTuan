import { getCloudflareContext } from "@opennextjs/cloudflare";
import { VARIANT_FORMATS, VARIANT_WIDTHS, variantKey, type VariantFormat } from "@/lib/image-variants";
import { createImageSourceToken } from "@/lib/image-source-auth";

const MAX_BINDING_INPUT_BYTES = 20 * 1024 * 1024;

type VariantBindings = {
  PHOTOGRAPHY_R2?: {
    get: (key: string) => Promise<{ body?: ReadableStream<Uint8Array> } | null>;
    head: (key: string) => Promise<unknown>;
    put: (key: string, value: ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
  };
  IMAGES?: {
    input: (stream: ReadableStream<Uint8Array>) => { transform: (options: { width: number; fit: "scale-down" }) => { output: (options: { format: "image/avif" | "image/webp" | "image/jpeg"; quality: number }) => Promise<{ image: () => ReadableStream<Uint8Array> }> } };
  };
};

type ImageTransformFetchInit = RequestInit & {
  cf?: { image: { width: number; fit: "scale-down"; format: "avif" | "webp" | "jpeg"; quality: number } };
};

function imageFormat(format: VariantFormat) {
  return format === "jpeg" ? "image/jpeg" : `image/${format}` as "image/avif" | "image/webp";
}

export async function createCloudflareWebpVariants(imageId: string, objectKey: string, contentLength: number) {
  if (contentLength > MAX_BINDING_INPUT_BYTES) return false;
  const context = await getCloudflareContext({ async: true });
  const bindings = context.env as VariantBindings;
  const bucket = bindings.PHOTOGRAPHY_R2;
  const images = bindings.IMAGES;
  if (!bucket || !images) return false;

  for (const width of VARIANT_WIDTHS) {
    for (const format of VARIANT_FORMATS) {
      const key = variantKey(imageId, width, format);
      if (await bucket.head(key)) continue;
      const source = await bucket.get(objectKey);
      if (!source?.body) throw new Error("Original image disappeared before variant generation");
      const output = await images.input(source.body)
        .transform({ width, fit: "scale-down" })
        .output({ format: imageFormat(format), quality: format === "avif" ? 73 : format === "webp" ? 88 : 90 });
      await bucket.put(key, output.image(), {
        httpMetadata: { contentType: imageFormat(format), cacheControl: "public, max-age=31536000, immutable" },
      });
    }
  }
  return true;
}

/**
 * Uses Cloudflare's remote-image transformation service. The Worker only
 * streams the private R2 source into the subrequest; it never decodes or
 * buffers the original image. This path also supports originals over 20MB.
 */
export async function createCloudflareRemoteVariants(imageId: string, baseUrl: string) {
  const context = await getCloudflareContext({ async: true });
  const bindings = context.env as VariantBindings;
  const bucket = bindings.PHOTOGRAPHY_R2;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!bucket || !secret) return false;

  const sourceUrl = new URL(`/img/source/${encodeURIComponent(imageId)}`, baseUrl).toString();
  const token = await createImageSourceToken(imageId, secret);
  for (const width of VARIANT_WIDTHS) {
    for (const format of VARIANT_FORMATS) {
      const key = variantKey(imageId, width, format);
      if (await bucket.head(key)) continue;
      const transformed = await fetch(sourceUrl, {
        headers: { "x-image-source-token": token },
        cf: {
          image: {
            width,
            fit: "scale-down",
            format: format as "avif" | "webp" | "jpeg",
            quality: format === "avif" ? 73 : format === "webp" ? 88 : 90,
          },
        },
      } as ImageTransformFetchInit);
      if (!transformed.ok || !transformed.body) throw new Error(`Cloudflare image transformation failed (${transformed.status})`);
      await bucket.put(key, transformed.body, {
        httpMetadata: { contentType: imageFormat(format), cacheControl: "public, max-age=31536000, immutable" },
      });
    }
  }
  return true;
}

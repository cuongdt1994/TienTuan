import { getCloudflareContext } from "@opennextjs/cloudflare";
import { VARIANT_FORMATS, VARIANT_WIDTHS, variantKey, type VariantFormat } from "@/lib/image-variants";

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

export const VARIANT_WIDTHS = [640, 1280, 1920, 2560, 3200] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];
export type VariantFormat = "avif" | "webp" | "jpeg";
export const VARIANT_FORMATS: readonly VariantFormat[] = ["avif", "webp", "jpeg"];

export function nearestVariantWidth(value: string | null) {
  const requested = Number(value ?? "1920");
  if (!Number.isFinite(requested)) return 1920 satisfies VariantWidth;
  return VARIANT_WIDTHS.find((width) => requested <= width) ?? VARIANT_WIDTHS.at(-1)!;
}

export function preferredVariantFormat(accept: string | null): VariantFormat {
  const value = accept ?? "";
  if (value.includes("image/avif")) return "avif";
  if (value.includes("image/webp")) return "webp";
  return "jpeg";
}

export function variantKey(imageId: string, width: VariantWidth, format: VariantFormat) {
  return `variants/${imageId}/${width}.${format === "jpeg" ? "jpg" : format}`;
}

export function variantUrl(imageId: string, width: VariantWidth = 1920) {
  return `/img/${encodeURIComponent(imageId)}?w=${width}`;
}

export function variantSrcSet(imageId: string) {
  return VARIANT_WIDTHS.map((width) => `${variantUrl(imageId, width)} ${width}w`).join(", ");
}

export function variantContentType(format: VariantFormat) {
  return format === "avif" ? "image/avif" : format === "webp" ? "image/webp" : "image/jpeg";
}

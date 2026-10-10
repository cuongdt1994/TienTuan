import { variantSrcSet, variantUrl } from "@/lib/image-variants";

export function ResponsiveImage({
  imageId,
  alt,
  width,
  height,
  sizes,
  className,
  style,
  priority = false,
}: {
  imageId: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  const srcSet = variantSrcSet(imageId);
  const loading = priority ? "eager" : "lazy";
  return <picture className="absolute inset-0 block">
    <source type="image/avif" srcSet={srcSet} sizes={sizes} />
    <source type="image/webp" srcSet={srcSet} sizes={sizes} />
    <img
      src={variantUrl(imageId, 1920)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      className={`absolute inset-0 h-full w-full ${className ?? ""}`}
      style={style}
    />
  </picture>;
}

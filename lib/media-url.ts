const MINIO_HOST = "10.100.101.22";
const MINIO_PORT = "9010";
const MINIO_BUCKET = "photography";

export function browserImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== MINIO_HOST || url.port !== MINIO_PORT) return value;
    const prefix = `/${MINIO_BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return value;
    const key = url.pathname.slice(prefix.length);
    if (!key) return value;
    return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  } catch {
    return value;
  }
}

/**
 * Migrated originals can be very large (some are 20+ MB). Sending those
 * through Next/Image on the Worker makes Cloudflare decode and resize the
 * full source for every cold transform, which can exceed the Worker CPU
 * limit. Let the R2 CDN serve those files directly instead.
 */
export function isOriginalMediaUrl(value: string) {
  try {
    return new URL(value, "http://localhost").pathname.includes("/originals/");
  } catch {
    return false;
  }
}

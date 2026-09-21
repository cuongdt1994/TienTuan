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

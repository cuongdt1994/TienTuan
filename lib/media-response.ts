import { NextResponse } from "next/server";
import { readObject } from "@/lib/minio";

const validKey = /^(?:originals|projects|site\/intro)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function mediaResponse(key: string) {
  if (!validKey.test(key) || key.includes("..")) {
    return NextResponse.json({ error: "Invalid media key" }, { status: 400 });
  }

  try {
    const object = await readObject(key);
    if (!object.Body) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    });
    if (object.ContentType && imageTypes.has(object.ContentType)) headers.set("Content-Type", object.ContentType);
    if (typeof object.ContentLength === "number") headers.set("Content-Length", String(object.ContentLength));
    if (object.ETag) headers.set("ETag", object.ETag);
    return new NextResponse(object.Body.transformToWebStream(), { headers });
  } catch {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
}

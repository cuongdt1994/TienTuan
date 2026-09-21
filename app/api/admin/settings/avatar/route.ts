import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjectUrls, objectUrl, putObject, readObject } from "@/lib/minio";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { avatarProcessSchema, MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES } from "@/lib/validations";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`avatar-process:${getClientKey(request)}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many avatar uploads. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  const parsed = avatarProcessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid avatar upload" }, { status: 400 });

  const createdUrls: string[] = [];
  try {
    const source = await readObject(parsed.data.objectKey);
    if (!source.Body) throw new Error("Missing avatar body");
    if (typeof source.ContentLength === "number" && source.ContentLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Avatar is too large" }, { status: 413 });
    const original = Buffer.from(await source.Body.transformToByteArray());
    if (original.byteLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Avatar is too large" }, { status: 413 });
    const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.[^.]+$/, "");
    const key = `site/intro/avatar-${randomUUID()}-${safeName || "profile"}.webp`;
    const normalized = sharp(original, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
    const metadata = await normalized.metadata();
    if (!metadata.width || !metadata.height || !metadata.format || !["jpeg", "png", "webp", "avif"].includes(metadata.format)) {
      return NextResponse.json({ error: "Unsupported or invalid avatar" }, { status: 400 });
    }
    const avatar = await normalized
      .resize({ width: 900, height: 900, fit: "cover", position: "centre" })
      .webp({ quality: 90 })
      .toBuffer();
    const avatarUrl = await putObject(key, avatar, "image/webp");
    createdUrls.push(avatarUrl);
    const current = await db.siteSettings.findUnique({ where: { id: "site" } });
    await db.siteSettings.upsert({
      where: { id: "site" },
      update: { introAvatarUrl: avatarUrl },
      create: { id: "site", introAvatarUrl: avatarUrl },
    });

    await deleteObjectUrls([objectUrl(parsed.data.objectKey)]).catch(() => undefined);
    if (current?.introAvatarUrl && current.introAvatarUrl !== avatarUrl) {
      await deleteObjectUrls([current.introAvatarUrl]).catch((error) => console.error("Could not remove previous avatar", error));
    }
    return NextResponse.json({ avatarUrl });
  } catch (error) {
    if (createdUrls.length) await deleteObjectUrls(createdUrls).catch(() => undefined);
    console.error("Avatar processing failed", error);
    return NextResponse.json({ error: "Avatar processing failed" }, { status: 500 });
  }
}

export async function DELETE() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await db.siteSettings.findUnique({ where: { id: "site" } });
  await db.siteSettings.upsert({ where: { id: "site" }, update: { introAvatarUrl: null }, create: { id: "site", introAvatarUrl: null } });
  if (current?.introAvatarUrl) await deleteObjectUrls([current.introAvatarUrl]).catch((error) => console.error("Could not remove avatar", error));
  return NextResponse.json({ avatarUrl: null });
}

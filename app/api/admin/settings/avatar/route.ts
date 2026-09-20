import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjectUrls, objectUrl, putObject, readObject } from "@/lib/minio";
import { avatarProcessSchema } from "@/lib/validations";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = avatarProcessSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid avatar upload" }, { status: 400 });

  try {
    const source = await readObject(parsed.data.objectKey);
    if (!source.Body) throw new Error("Missing avatar body");
    const original = Buffer.from(await source.Body.transformToByteArray());
    const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.[^.]+$/, "");
    const key = `site/intro/avatar-${Date.now()}-${safeName || "profile"}.webp`;
    const avatar = await sharp(original)
      .rotate()
      .resize({ width: 900, height: 900, fit: "cover", position: "centre" })
      .webp({ quality: 90 })
      .toBuffer();
    const avatarUrl = await putObject(key, avatar, "image/webp");
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

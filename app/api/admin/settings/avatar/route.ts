import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjectUrls, headObject, privateObjectRef } from "@/lib/minio";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { avatarProcessSchema, MAX_UPLOAD_BYTES } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";
import { invalidateSiteContent } from "@/lib/content-cache";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`avatar-process:${getClientKey(request)}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many avatar uploads. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  const parsed = avatarProcessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid avatar upload" }, { status: 400 });

  try {
    const source = await headObject(parsed.data.objectKey);
    if (!source.ContentLength || source.ContentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Avatar is too large" }, { status: 413 });
    }
    const context = await getCloudflareContext({ async: true });
    const bucket = context.env.PHOTOGRAPHY_R2;
    const images = context.env.IMAGES;
    if (!bucket || !images) return NextResponse.json({ error: "Image processing is not configured" }, { status: 503 });
    if (source.ContentLength > 20 * 1024 * 1024) return NextResponse.json({ error: "Avatar must be 20MB or smaller for automatic processing" }, { status: 413 });
    const original = await bucket.get(parsed.data.objectKey);
    if (!original?.body) throw new Error("Missing avatar body");
    const output = await images.input(original.body).transform({ width: 900, height: 900, fit: "cover" }).output({ format: "image/webp", quality: 90 });
    const body = await new Response(output.image()).arrayBuffer();
    const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.[^.]+$/, "");
    const key = `site/intro/avatar-${crypto.randomUUID()}-${safeName || "profile"}.webp`;
    await bucket.put(key, body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    const avatarUrl = `/media/${key}`;
    const current = await db.siteSettings.findUnique({ where: { id: "site" } });
    await db.siteSettings.upsert({
      where: { id: "site" },
      update: { introAvatarUrl: avatarUrl },
      create: { id: "site", introAvatarUrl: avatarUrl },
    });

    await deleteObjectUrls([privateObjectRef(parsed.data.objectKey)]).catch(() => undefined);
    if (current?.introAvatarUrl && current.introAvatarUrl !== avatarUrl) {
      await deleteObjectUrls([current.introAvatarUrl]).catch((error) => console.error("Could not remove previous avatar", error));
    }
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "AVATAR_UPDATED", entityType: "SiteSettings", entityId: "site" });
    invalidateSiteContent();
    return NextResponse.json({ avatarUrl });
  } catch (error) {
    await deleteObjectUrls([privateObjectRef(parsed.data.objectKey)]).catch(() => undefined);
    console.error("Avatar processing failed", error);
    return NextResponse.json({ error: "Avatar processing failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await db.siteSettings.findUnique({ where: { id: "site" } });
  await db.siteSettings.upsert({ where: { id: "site" }, update: { introAvatarUrl: null }, create: { id: "site", introAvatarUrl: null } });
  if (current?.introAvatarUrl) await deleteObjectUrls([current.introAvatarUrl]).catch((error) => console.error("Could not remove avatar", error));
  await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "AVATAR_REMOVED", entityType: "SiteSettings", entityId: "site" });
  invalidateSiteContent();
  return NextResponse.json({ avatarUrl: null });
}

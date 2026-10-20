import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { headObject, privateObjectRef } from "@/lib/minio";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { imageProcessSchema, MAX_UPLOAD_BYTES } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";
import { variantUrl } from "@/lib/image-variants";
import { writeImageSourceManifest } from "@/lib/image-source";
import { invalidateSiteContent } from "@/lib/content-cache";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`image-process:${getClientKey(request)}`, 40, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many image processing requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
  const { id: projectId } = await context.params;
  const parsed = imageProcessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const { objectKey, filename } = parsed.data;
  const project = await db.project.findUnique({ where: { id: projectId }, include: { images: { where: { deletedAt: null } } } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  try {
    const source = await headObject(objectKey);
    if (!source.ContentLength) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }
    if (source.ContentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }
    const imageId = crypto.randomUUID();
    await writeImageSourceManifest(imageId, { objectKey, contentType: parsed.data.contentType, size: source.ContentLength });
    const image = await db.image.create({ data: { id: imageId, projectId, originalUrl: privateObjectRef(objectKey), largeUrl: variantUrl(imageId, 1920), mediumUrl: variantUrl(imageId, 1280), thumbnailUrl: variantUrl(imageId, 640), width: parsed.data.width, height: parsed.data.height, sortOrder: project.images.length, alt: `${project.title} - Photo ${String(project.images.length + 1).padStart(2, "0")}` } });
    if (!project.coverImageId) await db.project.update({ where: { id: projectId }, data: { coverImageId: image.id } });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "IMAGE_UPLOADED", entityType: "Image", entityId: image.id, metadata: { projectId, filename } });
    invalidateSiteContent();
    const variants = "on-demand";
    return NextResponse.json({ image, variants });
  } catch (error) {
    console.error("Image processing failed", error);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}

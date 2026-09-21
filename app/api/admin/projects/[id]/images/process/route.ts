import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjectUrls, objectUrl, putObject, readObject } from "@/lib/minio";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { imageProcessSchema, MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES } from "@/lib/validations";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`image-process:${getClientKey(request)}`, 40, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many image processing requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
  const { id: projectId } = await context.params;
  const parsed = imageProcessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const { objectKey, filename } = parsed.data;
  const project = await db.project.findUnique({ where: { id: projectId }, include: { images: { where: { deletedAt: null } } } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const createdUrls: string[] = [];
  try {
    const source = await readObject(objectKey);
    if (!source.Body) throw new Error("Missing object body");
    if (typeof source.ContentLength === "number" && source.ContentLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    const original = Buffer.from(await source.Body.transformToByteArray());
    if (original.byteLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    const base = `projects/${project.slug}/${randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180)}`;
    const normalized = sharp(original, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
    const metadata = await normalized.metadata();
    if (!metadata.width || !metadata.height || !metadata.format || !["jpeg", "png", "webp", "avif"].includes(metadata.format)) {
      return NextResponse.json({ error: "Unsupported or invalid image" }, { status: 400 });
    }
    const width = metadata.width;
    const height = metadata.height;
    const [large, medium, thumbnail] = await Promise.all([
      normalized.clone().resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
      normalized.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
      normalized.clone().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    ]);
    const largeUrl = await putObject(`${base}/large.webp`, large, "image/webp");
    createdUrls.push(largeUrl);
    const mediumUrl = await putObject(`${base}/medium.webp`, medium, "image/webp");
    createdUrls.push(mediumUrl);
    const thumbnailUrl = await putObject(`${base}/thumbnail.webp`, thumbnail, "image/webp");
    createdUrls.push(thumbnailUrl);
    const image = await db.image.create({ data: { projectId, originalUrl: objectUrl(objectKey), largeUrl, mediumUrl, thumbnailUrl, width, height, sortOrder: project.images.length, alt: `${project.title} - Photo ${String(project.images.length + 1).padStart(2, "0")}` } });
    if (!project.coverImageId) await db.project.update({ where: { id: projectId }, data: { coverImageId: image.id } });
    return NextResponse.json({ image });
  } catch (error) {
    if (createdUrls.length) await deleteObjectUrls(createdUrls).catch(() => undefined);
    console.error("Image processing failed", error);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}

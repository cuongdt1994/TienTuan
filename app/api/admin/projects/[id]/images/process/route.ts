import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { objectUrl, putObject, readObject } from "@/lib/minio";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await context.params;
  const { objectKey, filename, contentType } = await request.json();
  if (typeof objectKey !== "string" || typeof filename !== "string" || !String(contentType).startsWith("image/")) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const project = await db.project.findUnique({ where: { id: projectId }, include: { images: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  try {
    const source = await readObject(objectKey);
    if (!source.Body) throw new Error("Missing object body");
    const original = Buffer.from(await source.Body.transformToByteArray());
    const base = `projects/${project.slug}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const normalized = sharp(original).rotate();
    const metadata = await normalized.metadata();
    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    const [large, medium, thumbnail] = await Promise.all([
      normalized.clone().resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
      normalized.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(),
      normalized.clone().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    ]);
    const [largeUrl, mediumUrl, thumbnailUrl] = await Promise.all([
      putObject(`${base}/large.webp`, large, "image/webp"),
      putObject(`${base}/medium.webp`, medium, "image/webp"),
      putObject(`${base}/thumbnail.webp`, thumbnail, "image/webp"),
    ]);
    const image = await db.image.create({ data: { projectId, originalUrl: objectUrl(objectKey), largeUrl, mediumUrl, thumbnailUrl, width, height, sortOrder: project.images.length, alt: `${project.title} - Photo ${String(project.images.length + 1).padStart(2, "0")}` } });
    if (!project.coverImageId) await db.project.update({ where: { id: projectId }, data: { coverImageId: image.id } });
    return NextResponse.json({ image });
  } catch (error) {
    console.error("Image processing failed", error);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}

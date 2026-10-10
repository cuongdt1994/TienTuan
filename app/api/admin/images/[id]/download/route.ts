import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { objectKeyFromUrl, readObject } from "@/lib/minio";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const image = await db.image.findFirst({ where: { id, deletedAt: null } });
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const key = objectKeyFromUrl(image.originalUrl);
  if (!key || !key.startsWith("originals/")) return NextResponse.json({ error: "Original file is unavailable" }, { status: 404 });
  const object = await readObject(key);
  if (!object.Body) return NextResponse.json({ error: "Original file is unavailable" }, { status: 404 });
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(image.alt ?? `${image.id}.jpg`)}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (object.ContentType) headers.set("Content-Type", object.ContentType);
  if (typeof object.ContentLength === "number") headers.set("Content-Length", String(object.ContentLength));
  return new NextResponse(object.Body.transformToWebStream(), { headers });
}

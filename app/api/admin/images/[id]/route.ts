import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { imagePatchSchema } from "@/lib/validations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = imagePatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid image update" }, { status: 400 });
  const image = await db.image.findFirst({ where: { id, deletedAt: null } });
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  if (body.data.cover) await db.project.update({ where: { id: image.projectId }, data: { coverImageId: image.id } });
  const updated = await db.image.update({ where: { id }, data: { ...(body.data.alt !== undefined ? { alt: body.data.alt } : {}) } });
  return NextResponse.json({ image: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const image = await db.image.findFirst({ where: { id, deletedAt: null } });
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  try {
    await db.$transaction(async (transaction) => {
      await transaction.image.update({ where: { id }, data: { deletedAt: new Date() } });
      await transaction.project.updateMany({ where: { id: image.projectId, coverImageId: id }, data: { coverImageId: null } });
    });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "IMAGE_TRASHED", entityType: "Image", entityId: id, metadata: { projectId: image.projectId } });
    return NextResponse.json({ ok: true, undoAvailable: true });
  } catch (error) {
    console.error("Image deletion failed", error);
    return NextResponse.json({ error: "Could not move image to trash" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const image = await db.image.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!image) return NextResponse.json({ error: "Image is not in trash" }, { status: 404 });
  const restored = await db.image.update({ where: { id }, data: { deletedAt: null } });
  await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "IMAGE_RESTORED", entityType: "Image", entityId: id, metadata: { projectId: image.projectId } });
  return NextResponse.json({ image: restored });
}

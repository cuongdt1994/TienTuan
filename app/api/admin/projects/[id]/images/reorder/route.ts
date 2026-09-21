import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reorderIdsSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = reorderIdsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const ids = parsed.data.ids;

  const projectImages = await db.image.findMany({ where: { projectId, deletedAt: null }, select: { id: true } });
  const knownIds = new Set(projectImages.map((image) => image.id));
  const submittedIds = new Set(ids);
  if (ids.length !== projectImages.length || submittedIds.size !== ids.length || ids.some((imageId: string) => !knownIds.has(imageId))) {
    return NextResponse.json({ error: "Image order does not match this project" }, { status: 400 });
  }

  await db.$transaction(ids.map((imageId: string, index: number) => db.image.update({ where: { id: imageId }, data: { sortOrder: index } })));
  await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "IMAGES_REORDERED", entityType: "Project", entityId: projectId });
  return NextResponse.json({ ok: true });
}

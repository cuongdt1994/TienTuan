import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";
import { deleteObjectUrls } from "@/lib/minio";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = projectSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  const { id } = await context.params;
  try {
    const project = await db.project.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.status ? { publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null } : {}) } });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "PROJECT_UPDATED", entityType: "Project", entityId: id, metadata: parsed.data });
    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Could not update project. The slug may already exist." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!isSameOrigin(_request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const project = await db.project.findUnique({ where: { id }, include: { images: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  try {
    await deleteObjectUrls(project.images.flatMap((image) => [image.originalUrl, image.largeUrl, image.mediumUrl, image.thumbnailUrl]));
    await db.project.delete({ where: { id } });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "PROJECT_DELETED", entityType: "Project", entityId: id, metadata: { title: project.title } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Project deletion failed", error);
    return NextResponse.json({ error: "Could not delete project files" }, { status: 500 });
  }
}

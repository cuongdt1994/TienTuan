import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid project" }, { status: 400 });
  try {
    const project = await db.$transaction(async (transaction) => {
      await transaction.project.updateMany({ data: { sortOrder: { increment: 1 } } });
      return transaction.project.create({ data: { ...parsed.data, description: parsed.data.description || null, previewToken: randomBytes(24).toString("base64url"), sortOrder: 0, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null }, include: { category: true, images: true, coverImage: true } });
    });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "PROJECT_CREATED", entityType: "Project", entityId: project.id, metadata: { status: project.status, categoryId: project.categoryId } });
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique") ? "That slug is already in use." : "Could not create project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

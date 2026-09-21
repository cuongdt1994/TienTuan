import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";
import { createPreviewToken } from "@/lib/preview-token";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(_request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const token = createPreviewToken();
  await db.project.update({ where: { id }, data: { previewToken: token } });
  await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "PREVIEW_CREATED", entityType: "Project", entityId: id });
  const previewUrl = new URL(`/preview/${project.slug}`, env.NEXT_PUBLIC_SITE_URL);
  previewUrl.searchParams.set("token", token);
  return NextResponse.json({ previewUrl: previewUrl.toString() });
}

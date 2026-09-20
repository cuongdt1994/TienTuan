import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, slug: true, previewToken: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const token = project.previewToken ?? randomBytes(24).toString("base64url");
  if (!project.previewToken) await db.project.update({ where: { id }, data: { previewToken: token } });
  const previewUrl = new URL(`/preview/${project.slug}`, env.NEXT_PUBLIC_SITE_URL);
  previewUrl.searchParams.set("token", token);
  return NextResponse.json({ previewUrl: previewUrl.toString() });
}

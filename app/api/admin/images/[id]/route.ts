import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await context.params; const body = await request.json(); const image = await db.image.findUnique({ where: { id } }); if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 }); if (body.cover) await db.project.update({ where: { id: image.projectId }, data: { coverImageId: image.id } }); const updated = await db.image.update({ where: { id }, data: { ...(typeof body.alt === "string" ? { alt: body.alt } : {}) } }); return NextResponse.json({ image: updated }); }
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await context.params; await db.image.delete({ where: { id } }); return NextResponse.json({ ok: true }); }

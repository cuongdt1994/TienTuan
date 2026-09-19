import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id: projectId } = await context.params; const { ids } = await request.json(); if (!Array.isArray(ids)) return NextResponse.json({ error: "Invalid order" }, { status: 400 }); await db.$transaction(ids.map((id: string, index: number) => db.image.updateMany({ where: { id, projectId }, data: { sortOrder: index } }))); return NextResponse.json({ ok: true }); }

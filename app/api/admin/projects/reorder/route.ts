import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { ids } = await request.json(); if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return NextResponse.json({ error: "Invalid order" }, { status: 400 }); await db.$transaction(ids.map((id: string, index: number) => db.project.update({ where: { id }, data: { sortOrder: index } }))); return NextResponse.json({ ok: true }); }

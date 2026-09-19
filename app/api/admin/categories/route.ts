import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import slugify from "slugify";

export async function GET() { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { projects: true } } } }); return NextResponse.json({ categories }); }
export async function POST(request: Request) { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { name } = await request.json(); if (typeof name !== "string" || name.trim().length < 2) return NextResponse.json({ error: "Invalid name" }, { status: 400 }); const max = await db.category.aggregate({ _max: { sortOrder: true } }); const category = await db.category.create({ data: { name: name.trim(), slug: slugify(name, { lower: true, strict: true }), sortOrder: (max._max.sortOrder ?? -1) + 1 } }); return NextResponse.json({ category }); }

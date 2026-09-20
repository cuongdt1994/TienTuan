import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json();
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const categories = await db.category.findMany({ select: { id: true } });
  const knownIds = new Set(categories.map((category) => category.id));
  if (ids.length !== categories.length || ids.some((id) => !knownIds.has(id))) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await db.$transaction(ids.map((id: string, index: number) => db.category.update({ where: { id }, data: { sortOrder: index } })));
  return NextResponse.json({ ok: true });
}

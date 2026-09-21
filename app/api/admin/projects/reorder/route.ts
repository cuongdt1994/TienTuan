import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reorderIdsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = reorderIdsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const projects = await db.project.findMany({ select: { id: true } });
  const knownIds = new Set(projects.map((project) => project.id));
  if (parsed.data.ids.length !== projects.length || parsed.data.ids.some((id) => !knownIds.has(id))) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  await db.$transaction(parsed.data.ids.map((id, index) => db.project.update({ where: { id }, data: { sortOrder: index } })));
  return NextResponse.json({ ok: true });
}

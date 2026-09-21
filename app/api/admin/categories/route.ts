import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import slugify from "slugify";
import { categoryCreateSchema } from "@/lib/validations";

export async function GET() { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { projects: true } } } }); return NextResponse.json({ categories }); }
export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = categoryCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  const slug = slugify(parsed.data.name, { lower: true, strict: true });
  if (!slug) return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
  try {
    const max = await db.category.aggregate({ _max: { sortOrder: true } });
    const category = await db.category.create({ data: { name: parsed.data.name, slug, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Could not create category. The name may already exist." }, { status: 409 });
  }
}

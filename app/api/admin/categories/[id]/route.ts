import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import slugify from "slugify";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(name, { lower: true, strict: true });

  if (name.length < 2 || !slug) return NextResponse.json({ error: "Invalid category name" }, { status: 400 });

  try {
    const category = await db.category.update({ where: { id }, data: { name, slug } });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Could not update category. The name may already exist." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const projectCount = await db.project.count({ where: { categoryId: id } });
  if (projectCount > 0) {
    return NextResponse.json({ error: `Cannot delete this category while it has ${projectCount} project${projectCount === 1 ? "" : "s"}.` }, { status: 409 });
  }

  try {
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
}

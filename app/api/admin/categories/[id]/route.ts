import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { categoryUpdateSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = categoryUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid category update" }, { status: 400 });

  try {
    const category = await db.category.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.showOnHome !== undefined ? { showOnHome: parsed.data.showOnHome } : {}),
      },
    });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "CATEGORY_UPDATED", entityType: "Category", entityId: id, metadata: { changed: Object.keys(parsed.data) } });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Could not update category. The name may already exist." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!isSameOrigin(_request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const projectCount = await db.project.count({ where: { categoryId: id } });
  if (projectCount > 0) {
    return NextResponse.json({ error: `Cannot delete this category while it has ${projectCount} project${projectCount === 1 ? "" : "s"}.` }, { status: 409 });
  }

  try {
    await db.category.delete({ where: { id } });
    await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "CATEGORY_DELETED", entityType: "Category", entityId: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
}

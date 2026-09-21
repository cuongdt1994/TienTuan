import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reorderIdsSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reorderIdsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const categories = await db.category.findMany({ select: { id: true } });
  const knownIds = new Set(categories.map((category) => category.id));
  if (parsed.data.ids.length !== categories.length || parsed.data.ids.some((id) => !knownIds.has(id))) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await db.$transaction(parsed.data.ids.map((id, index) => db.category.update({ where: { id }, data: { sortOrder: index } })));
  await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "CATEGORIES_REORDERED", entityType: "Category" });
  return NextResponse.json({ ok: true });
}

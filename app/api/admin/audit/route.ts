import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 12) || 12, 1), 50);
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, action: true, entityType: true, entityId: true, createdAt: true } });
  return NextResponse.json({ logs });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, clearSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.id !== "dev-admin") {
    await db.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
    await recordAudit({ userId: user.id, action: "LOGOUT_ALL_SESSIONS", entityType: "User", entityId: user.id });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}

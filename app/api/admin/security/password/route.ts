import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, clearSession } from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.id === "dev-admin") return NextResponse.json({ error: "Create a real admin account before changing the password." }, { status: 400 });
  const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  if (!await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, authVersion: { increment: 1 } } });
  await recordAudit({ userId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id });
  await clearSession();
  return NextResponse.json({ ok: true });
}

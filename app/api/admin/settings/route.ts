import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request-security";

export async function GET() { if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const settings = await db.siteSettings.findUnique({ where: { id: "site" } }); return NextResponse.json({ settings }); }
export async function PUT(request: Request) { if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); const user = await requireAdmin(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = settingsSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 }); const settings = await db.siteSettings.upsert({ where: { id: "site" }, update: parsed.data, create: { id: "site", ...parsed.data } }); await recordAudit({ userId: user.id === "dev-admin" ? undefined : user.id, action: "SETTINGS_UPDATED", entityType: "SiteSettings", entityId: "site" }); return NextResponse.json({ settings }); }

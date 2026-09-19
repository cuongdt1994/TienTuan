import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

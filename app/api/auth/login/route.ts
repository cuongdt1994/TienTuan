import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { consumeRateLimit, getClientKey, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const rateLimitKey = `login:${getClientKey(request)}`;
  const rateLimit = consumeRateLimit(rateLimitKey, 8, 15 * 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  resetRateLimit(rateLimitKey);
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

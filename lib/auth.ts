import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE_NAME = "atelier_session";
const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId, role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: String(payload.userId), role: String(payload.role) };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  if (session.userId === "dev-admin") {
    return {
      id: "dev-admin",
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      passwordHash: "",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  try {
    return await db.user.findUnique({ where: { id: session.userId } });
  } catch {
    return null;
  }
}

export async function verifyCredentials(email: string, password: string) {
  try {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && await bcrypt.compare(password, user.passwordHash)) return user;
  } catch {
    // During local development the database may not be running yet.
  }

  const devLoginAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "true";
  if (devLoginAllowed && email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase() && password === (process.env.ADMIN_PASSWORD ?? "change-me-before-production")) {
    return {
      id: "dev-admin",
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      passwordHash: "",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return null;
}

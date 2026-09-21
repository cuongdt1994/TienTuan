import "server-only";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose/jwt/verify";
import { SignJWT } from "jose/jwt/sign";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { SESSION_AUDIENCE, SESSION_ISSUER } from "@/lib/auth-constants";

const COOKIE_NAME = "atelier_session";
const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function createSession(userId: string) {
  let authVersion = 0;
  if (userId !== "dev-admin") {
    const user = await db.user.findUnique({ where: { id: userId }, select: { authVersion: true } });
    if (!user) throw new Error("User not found");
    authVersion = user.authVersion;
  }
  const token = await new SignJWT({ userId, role: "ADMIN", authVersion })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || env.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
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
    // Keep sessions issued before the security upgrade valid when their authVersion is still current.
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.role !== "ADMIN" || typeof payload.userId !== "string") return null;
    const userId = payload.userId;
    if (userId !== "dev-admin") {
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, authVersion: true } });
      if (!user || user.role !== "ADMIN" || user.authVersion !== Number(payload.authVersion ?? 0)) return null;
    }
    return { userId, role: "ADMIN" as const };
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
    const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && await bcrypt.compare(password, user.passwordHash)) return user;
  } catch {
    // During local development the database may not be running yet.
  }

  const devLoginAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN === "true";
  if (devLoginAllowed && email.trim().toLowerCase() === (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase() && password === (process.env.ADMIN_PASSWORD ?? "change-me-before-production")) {
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

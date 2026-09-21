import { jwtVerify } from "jose/jwt/verify";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_AUDIENCE, SESSION_ISSUER } from "@/lib/auth-constants";

const SESSION_COOKIE = "atelier_session";

function isAllowedAdminOrigin(request: NextRequest, origin: string) {
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") return false;

    const allowedOrigins = new Set<string>();
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (configuredSiteUrl) allowedOrigins.add(new URL(configuredSiteUrl).origin);
    allowedOrigins.add(request.nextUrl.origin);
    return allowedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if ((!isAdminPage && !isAdminApi) || pathname === "/admin/login") return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (!origin || !isAllowedAdminOrigin(request, origin)) {
      return isAdminApi
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const unauthorized = () => isAdminApi
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/admin/login", request.url));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !authSecret) return unauthorized();

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.role !== "ADMIN" || typeof payload.userId !== "string") return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

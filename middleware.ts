import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

function isAllowedAdminOrigin(request: NextRequest, origin: string) {
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") return false;
    const configuredHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
    const requestHosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.nextUrl.host,
      configuredHost,
    ]
      .flatMap((value) => value?.split(",").map((item) => item.trim()) ?? [])
      .filter(Boolean);
    return requestHosts.includes(originUrl.host);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if ((!isAdminPage && !isAdminApi) || pathname === "/admin/login") return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedAdminOrigin(request, origin)) {
      return isAdminApi ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const unauthorized = () => isAdminApi
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/admin/login", request.url));
  const token = request.cookies.get("atelier_session")?.value;
  if (!token) return unauthorized();
  try {
    const authSecret = process.env.AUTH_SECRET ?? "development-only-secret-change-me-please";
    const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret));
    if (payload.role !== "ADMIN") return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

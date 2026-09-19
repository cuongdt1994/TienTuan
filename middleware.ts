import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = request.cookies.get("atelier_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/admin/login", request.url));
  try {
    const authSecret = process.env.AUTH_SECRET ?? "development-only-secret-change-me-please";
    await jwtVerify(token, new TextEncoder().encode(authSecret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export const config = { matcher: ["/admin/:path*"] };

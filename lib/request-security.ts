import "server-only";
import { env } from "@/lib/env";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    const referer = request.headers.get("referer");
    if (!referer) return false;
    try {
      const refererOrigin = new URL(referer).origin;
      const requestOrigin = new URL(request.url).origin;
      const siteOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
      return refererOrigin === requestOrigin || refererOrigin === siteOrigin;
    } catch {
      return false;
    }
  }
  try {
    const requestOrigin = new URL(request.url).origin;
    const siteOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
    return origin === requestOrigin || origin === siteOrigin;
  } catch {
    return false;
  }
}

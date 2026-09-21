import "server-only";
import { env } from "@/lib/env";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return true;
  try {
    const requestOrigin = new URL(request.url).origin;
    const siteOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
    return origin === requestOrigin || origin === siteOrigin;
  } catch {
    return false;
  }
}

import "server-only";
import { env } from "@/lib/env";

type RateLimitEntry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { rateLimitStore?: Map<string, RateLimitEntry> };
const store = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>();
if (!globalForRateLimit.rateLimitStore) globalForRateLimit.rateLimitStore = store;

function prune(now: number) {
  if (store.size < 1000) return;
  for (const [key, entry] of store) if (entry.resetAt <= now) store.delete(key);
  if (store.size <= 5000) return;
  const oldest = [...store.entries()].sort((left, right) => left[1].resetAt - right[1].resetAt).slice(0, store.size - 5000);
  for (const [key] of oldest) store.delete(key);
}

export function getClientKey(request: Request) {
  // Cloudflare overwrites this header at the edge. Prefer it over the
  // user-controlled forwarding headers so attackers cannot rotate XFF values
  // to bypass login/upload throttles.
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp && isIpAddress(cloudflareIp)) return cloudflareIp;

  if (env.TRUST_PROXY_HEADERS) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded && isIpAddress(forwarded)) return forwarded;
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp && isIpAddress(realIp)) return realIp;
  }
  return "unknown";
}

function isIpAddress(value: string) {
  if (value.length > 45) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return /^[0-9a-f:]+$/i.test(value) && value.includes(":");
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

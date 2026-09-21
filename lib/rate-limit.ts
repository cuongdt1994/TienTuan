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
  if (env.TRUST_PROXY_HEADERS) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }
  return "unknown";
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

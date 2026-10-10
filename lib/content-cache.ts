import "server-only";
import { revalidateTag } from "next/cache";

/** Invalidate cached public metadata after an admin mutation. */
export function invalidateSiteContent() {
  try {
    revalidateTag("site-content", "max");
  } catch {
    // Cache invalidation must never turn a successful admin mutation into a 500.
  }
}

import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    ATELIER_PORTFOLIO_DB?: D1Database;
  }
}

export {};

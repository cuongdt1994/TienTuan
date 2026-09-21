import "server-only";
import { randomBytes } from "node:crypto";

export const PREVIEW_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createPreviewToken() {
  return `${Date.now().toString(36)}-${randomBytes(24).toString("base64url")}`;
}

export function isPreviewTokenFresh(token: string) {
  const [createdAt] = token.split("-", 1);
  const timestamp = Number.parseInt(createdAt, 36);
  return Number.isFinite(timestamp) && timestamp > 0 && Date.now() - timestamp <= PREVIEW_TOKEN_TTL_MS;
}

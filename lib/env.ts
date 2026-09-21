import "server-only";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const enforceProduction = isProduction && !isProductionBuild;

function requiredOrDefault(defaultValue: string) {
  return enforceProduction ? z.string().min(1) : z.string().min(1).default(defaultValue);
}

const booleanFromEnv = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(enforceProduction ? 32 : 16),
  NEXT_PUBLIC_SITE_URL: enforceProduction ? z.string().url() : z.string().url().default("http://localhost:3000"),
  MINIO_ENDPOINT: requiredOrDefault("localhost"),
  MINIO_PORT: enforceProduction ? z.coerce.number().int().min(1).max(65535) : z.coerce.number().int().min(1).max(65535).default(9000),
  MINIO_ACCESS_KEY: requiredOrDefault("minioadmin"),
  MINIO_SECRET_KEY: requiredOrDefault("minioadmin"),
  MINIO_BUCKET: enforceProduction ? z.string().min(3).regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/) : z.string().min(3).regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).default("photography"),
  MINIO_USE_SSL: booleanFromEnv.default(false),
  PUBLIC_IMAGE_BASE_URL: z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Image base URL must use HTTP or HTTPS").optional(),
  TRUST_PROXY_HEADERS: booleanFromEnv.default(false),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: enforceProduction ? process.env.DATABASE_URL : process.env.DATABASE_URL ?? "postgresql://portfolio:portfolio@localhost:5432/portfolio?schema=public",
  AUTH_SECRET: enforceProduction ? process.env.AUTH_SECRET : process.env.AUTH_SECRET ?? "development-only-secret-change-me-please",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_PORT: process.env.MINIO_PORT,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_BUCKET: process.env.MINIO_BUCKET,
  MINIO_USE_SSL: process.env.MINIO_USE_SSL,
  PUBLIC_IMAGE_BASE_URL: process.env.PUBLIC_IMAGE_BASE_URL,
  TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
});

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "environment").join(", ");
  throw new Error(`Invalid environment configuration: ${fields}`);
}

export const env = parsed.data;

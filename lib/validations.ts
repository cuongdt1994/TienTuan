import { z } from "zod";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

const optionalHttpUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), "URL must use HTTP or HTTPS"),
]);

const safeFilename = z.string().min(1).max(240).refine((value) => !/[\u0000\\/]/.test(value), "Invalid filename");

export const loginSchema = z.object({
  email: z.string().trim().email().max(240),
  password: z.string().min(8).max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export const projectSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  coverPositionX: z.number().int().min(0).max(100).optional(),
  coverPositionY: z.number().int().min(0).max(100).optional(),
});

export const settingsSchema = z.object({
  photographerName: z.string().min(2).max(120),
  phone: z.string().max(40).optional().or(z.literal("")),
  zalo: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  instagram: optionalHttpUrl,
  facebook: optionalHttpUrl,
  introEnabled: z.boolean().default(true),
  introAvatarUrl: optionalHttpUrl,
  websiteTitle: z.string().min(2).max(160),
  websiteDescription: z.string().max(240),
});

export const uploadSchema = z.object({
  filename: safeFilename,
  contentType: z.enum(IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const imageProcessSchema = z.object({
  objectKey: z.string().regex(/^originals\/[A-Za-z0-9_-]{20,}-[A-Za-z0-9._-]{1,180}$/, "Invalid upload object"),
  filename: safeFilename,
  contentType: z.enum(IMAGE_TYPES),
});

export const avatarProcessSchema = z.object({
  objectKey: imageProcessSchema.shape.objectKey,
  filename: safeFilename,
  contentType: z.enum(IMAGE_TYPES),
});

export const imagePatchSchema = z.object({
  cover: z.boolean().optional(),
  alt: z.string().max(240).optional(),
}).strict();

export const reorderIdsSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(1000),
}).strict();

export const categoryCreateSchema = z.object({ name: z.string().trim().min(2).max(120) }).strict();
export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  showOnHome: z.boolean().optional(),
}).strict().refine((value) => value.name !== undefined || value.showOnHome !== undefined, "No category changes provided");

export const previewTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,80}$/);

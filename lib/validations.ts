import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const projectSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const settingsSchema = z.object({
  photographerName: z.string().min(2).max(120),
  phone: z.string().max(40).optional().or(z.literal("")),
  zalo: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().max(240).optional().or(z.literal("")),
  facebook: z.string().max(240).optional().or(z.literal("")),
  introEnabled: z.boolean().default(true),
  introAvatarUrl: z.string().max(500).optional().or(z.literal("")),
  websiteTitle: z.string().min(2).max(160),
  websiteDescription: z.string().max(240),
});

export const uploadSchema = z.object({
  filename: z.string().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export const avatarProcessSchema = z.object({
  objectKey: z.string().startsWith("originals/").max(500),
  filename: z.string().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
});

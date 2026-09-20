import type { Category, Image, Project, SiteSettings } from "@prisma/client";
import { db } from "@/lib/db";

export type ProjectWithMedia = Project & {
  category: Category;
  images: Image[];
  coverImage: Image | null;
};

export const demoSettings: SiteSettings = {
  id: "site",
  photographerName: process.env.PHOTOGRAPHER_NAME ?? "Tien Tuan Photography",
  phone: "034 237 1168",
  zalo: null,
  email: "tientuan1408@gmail.com",
  instagram: "https://www.instagram.com/dotientuann_",
  facebook: "https://fb.com/dotientuan09.05",
  introEnabled: true,
  introAvatarUrl: null,
  websiteTitle: "Tien Tuan Photography — Editorial Image Maker",
  websiteDescription: "Editorial photography for culture, fashion, and people.",
  updatedAt: new Date(),
};

export async function getSettings() {
  try {
    return (await db.siteSettings.findUnique({ where: { id: "site" } })) ?? demoSettings;
  } catch {
    return demoSettings;
  }
}

export async function getPublishedProjects(categorySlug?: string) {
  try {
    const projects = await db.project.findMany({
      where: { status: "PUBLISHED", ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, coverImage: true },
      orderBy: { sortOrder: "asc" },
    });
    return projects;
  } catch {
    return [];
  }
}

export async function getPublishedProjectSlugs() {
  try {
    return await db.project.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getProject(slug: string) {
  try {
    const project = await db.project.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, coverImage: true },
    });
    return project;
  } catch {
    return null;
  }
}

export async function getCategories() {
  try {
    const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
    return categories;
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    return await db.category.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

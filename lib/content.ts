import type { Category, Image, Project, SiteSettings } from "@prisma/client";
import { db } from "@/lib/db";

export type ProjectWithMedia = Project & {
  category: Category;
  images: Image[];
  coverImage: Image | null;
};

export const demoProjects: ProjectWithMedia[] = [
  {
    id: "demo-nocturne",
    title: "Nocturne / Maison 2026",
    slug: "nocturne-maison-2026",
    description: "A study in form, atmosphere, and quiet gestures.",
    status: "PUBLISHED",
    sortOrder: 0,
    coverImageId: "demo-image-1",
    categoryId: "demo-commercial",
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
    publishedAt: new Date("2026-01-20"),
    category: { id: "demo-commercial", name: "Commercial & KV", slug: "commercial", sortOrder: 0, createdAt: new Date() },
    images: [
      { id: "demo-image-1", projectId: "demo-nocturne", originalUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2400&q=88", largeUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2400&q=88", mediumUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1400&q=88", thumbnailUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=720&q=82", width: 1800, height: 2400, alt: "Nocturne / Maison 2026 - Photo 01", sortOrder: 0, createdAt: new Date() },
      { id: "demo-image-2", projectId: "demo-nocturne", originalUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=88", largeUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=88", mediumUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=88", thumbnailUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=720&q=82", width: 1800, height: 2400, alt: "Nocturne / Maison 2026 - Photo 02", sortOrder: 1, createdAt: new Date() },
    ],
    coverImage: null,
  },
  {
    id: "demo-after-light",
    title: "After Light",
    slug: "after-light",
    description: "Beauty as a soft conversation between skin and shadow.",
    status: "PUBLISHED",
    sortOrder: 1,
    coverImageId: "demo-image-3",
    categoryId: "demo-beauty",
    createdAt: new Date("2026-02-12"),
    updatedAt: new Date("2026-02-12"),
    publishedAt: new Date("2026-02-12"),
    category: { id: "demo-beauty", name: "Beauty", slug: "beauty", sortOrder: 1, createdAt: new Date() },
    images: [{ id: "demo-image-3", projectId: "demo-after-light", originalUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=2400&q=88", largeUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=2400&q=88", mediumUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1400&q=88", thumbnailUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=720&q=82", width: 1800, height: 2200, alt: "After Light - Photo 01", sortOrder: 0, createdAt: new Date() }],
    coverImage: null,
  },
  {
    id: "demo-soft-structures",
    title: "Soft Structures",
    slug: "soft-structures",
    description: "Portraits built from presence, texture, and restraint.",
    status: "PUBLISHED",
    sortOrder: 2,
    coverImageId: "demo-image-4",
    categoryId: "demo-portrait",
    createdAt: new Date("2026-03-03"),
    updatedAt: new Date("2026-03-03"),
    publishedAt: new Date("2026-03-03"),
    category: { id: "demo-portrait", name: "Portrait", slug: "portrait", sortOrder: 2, createdAt: new Date() },
    images: [{ id: "demo-image-4", projectId: "demo-soft-structures", originalUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=2400&q=88", largeUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=2400&q=88", mediumUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1400&q=88", thumbnailUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=720&q=82", width: 1800, height: 2400, alt: "Soft Structures - Photo 01", sortOrder: 0, createdAt: new Date() }],
    coverImage: null,
  },
];

export const demoSettings: SiteSettings = {
  id: "site",
  photographerName: process.env.PHOTOGRAPHER_NAME ?? "Tiến Tuấn Photography",
  phone: "034 237 1168",
  zalo: null,
  email: "tientuan1408@gmail.com",
  instagram: "https://www.instagram.com/dotientuann_",
  facebook: "https://fb.com/dotientuan09.05",
  websiteTitle: "Tiến Tuấn Photography — Editorial Image Maker",
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
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, coverImage: true },
      orderBy: { sortOrder: "asc" },
    });
    return projects.length ? projects : demoProjects.filter((project) => !categorySlug || project.category.slug === categorySlug);
  } catch {
    return demoProjects.filter((project) => !categorySlug || project.category.slug === categorySlug);
  }
}

export async function getProject(slug: string) {
  try {
    const project = await db.project.findUnique({
      where: { slug },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, coverImage: true },
    });
    return project ?? demoProjects.find((item) => item.slug === slug) ?? null;
  } catch {
    return demoProjects.find((item) => item.slug === slug) ?? null;
  }
}

export async function getCategories() {
  try {
    const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
    return categories.length ? categories : demoProjects.map((item) => item.category);
  } catch {
    return demoProjects.map((item) => item.category);
  }
}

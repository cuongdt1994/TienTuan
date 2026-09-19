import type { MetadataRoute } from "next";
import { getCategories, getPublishedProjects } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [projects, categories] = await Promise.all([getPublishedProjects(), getCategories()]);
  const categoryPages = categories
    .filter((category) => ["commercial", "beauty", "portrait"].includes(category.slug))
    .map((category) => ({ url: `${base}/${category.slug}`, lastModified: category.createdAt }));
  return [
    { url: base, lastModified: new Date() },
    ...categoryPages,
    { url: `${base}/contact`, lastModified: new Date() },
    ...projects.map((project) => ({ url: `${base}/${project.slug}`, lastModified: project.updatedAt })),
  ];
}

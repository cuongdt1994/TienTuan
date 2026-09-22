import type { MetadataRoute } from "next";
import { getCategories, getPublishedProjectSlugs } from "@/lib/content";
import { absoluteSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, categories] = await Promise.all([getPublishedProjectSlugs(), getCategories()]);
  const categoryPages = categories.map((category) => ({ url: absoluteSiteUrl(`/${category.slug}`), lastModified: category.createdAt, changeFrequency: "weekly" as const, priority: 0.8 }));
  return [
    { url: absoluteSiteUrl(), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...categoryPages,
    { url: absoluteSiteUrl("/contact"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...projects.map((project) => ({ url: absoluteSiteUrl(`/${project.slug}`), lastModified: project.updatedAt, changeFrequency: "monthly" as const, priority: 0.9 })),
  ];
}

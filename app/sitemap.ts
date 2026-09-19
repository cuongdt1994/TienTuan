import type { MetadataRoute } from "next";
import { getPublishedProjects } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const projects = await getPublishedProjects();
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/work`, lastModified: new Date() },
    { url: `${base}/commercial`, lastModified: new Date() },
    { url: `${base}/beauty`, lastModified: new Date() },
    { url: `${base}/portrait`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    ...projects.map((project) => ({ url: `${base}/${project.slug}`, lastModified: project.updatedAt })),
  ];
}

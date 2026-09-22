import { getCategories, getPublishedProjectSlugs } from "@/lib/content";
import { absoluteSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] ?? character);
}

function entry(url: string, lastModified: Date, changeFrequency: "weekly" | "monthly", priority: string) {
  return [
    "<url>",
    `<loc>${escapeXml(url)}</loc>`,
    `<lastmod>${lastModified.toISOString()}</lastmod>`,
    `<changefreq>${changeFrequency}</changefreq>`,
    `<priority>${priority}</priority>`,
    "</url>",
  ].join("");
}

export async function GET() {
  const [projects, categories] = await Promise.all([getPublishedProjectSlugs(), getCategories()]);
  const entries = [
    entry(absoluteSiteUrl(), new Date(), "weekly", "1.0"),
    ...categories.map((category) => entry(absoluteSiteUrl(`/${category.slug}`), category.createdAt, "weekly", "0.8")),
    entry(absoluteSiteUrl("/contact"), new Date(), "monthly", "0.5"),
    ...projects.map((project) => entry(absoluteSiteUrl(`/${project.slug}`), project.updatedAt, "monthly", "0.9")),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`;

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

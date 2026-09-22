import { browserImageUrl } from "@/lib/media-url";
import { absoluteSiteUrl } from "@/lib/site-url";
import type { ProjectWithMedia } from "@/lib/content";

type SiteStructuredDataProps = {
  name: string;
  description: string;
  instagram?: string | null;
  facebook?: string | null;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SiteStructuredData({ name, description, instagram, facebook }: SiteStructuredDataProps) {
  const siteUrl = absoluteSiteUrl();
  const sameAs = [instagram, facebook].filter((value): value is string => Boolean(value));
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${siteUrl}#person`,
        name,
        url: siteUrl,
        jobTitle: "Photographer",
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name,
        url: siteUrl,
        description,
        publisher: { "@id": `${siteUrl}#person` },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

export function ProjectStructuredData({ project }: { project: ProjectWithMedia }) {
  const siteUrl = absoluteSiteUrl(`/${project.slug}`);
  const imageUrls = project.images.map((image) => absoluteSiteUrl(browserImageUrl(image.largeUrl)));
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${siteUrl}#project`,
    name: project.title,
    description: project.description ?? `${project.title} photography project.`,
    url: siteUrl,
    image: imageUrls,
    genre: project.category.name,
    creator: { "@type": "Person", name: "Tien Tuan Photography", url: absoluteSiteUrl() },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

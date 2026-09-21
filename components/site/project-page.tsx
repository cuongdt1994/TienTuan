import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreviewProject, getProject, getPublishedProjects } from "@/lib/content";
import { JustifiedGallery } from "@/components/site/justified-gallery";
import { ProjectGrid } from "@/components/site/project-grid";
import { browserImageUrl } from "@/lib/media-url";

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export async function getProjectPageMetadata(slug: string, previewToken?: string): Promise<Metadata> {
  const project = previewToken ? await getPreviewProject(slug, previewToken) : await getProject(slug);
  if (!project) return { title: "Project not found" };
  const image = project.coverImage ?? project.images[0];
  return {
    title: `${project.title} — Tien Tuan Photography`,
    description: project.description ?? `${project.title} photography project.`,
    alternates: { canonical: `/${project.slug}` },
    openGraph: { title: project.title, description: project.description ?? undefined, images: image ? [browserImageUrl(image.largeUrl)] : undefined },
  };
}

export async function ProjectPage({ slug, previewToken }: { slug: string; previewToken?: string }) {
  const [project, publishedProjects] = await Promise.all([previewToken ? getPreviewProject(slug, previewToken) : getProject(slug), getPublishedProjects()]);
  if (!project) notFound();
  const images = project.images.map((image) => ({ src: browserImageUrl(image.originalUrl), thumbnailSrc: browserImageUrl(image.largeUrl), alt: image.alt ?? `${project.title} - Photo ${String(image.sortOrder + 1).padStart(2, "0")}`, width: image.width, height: image.height }));
  const relatedProjects = shuffle(publishedProjects.filter((item) => item.slug !== project.slug)).slice(0, 4);
  return <main className="pb-20 pt-16 md:pb-32 md:pt-28">
    <div className="site-wide-container"><div className="project-detail-heading mb-14 md:mb-24"><h1 className="project-detail-title">{project.title}</h1>{project.description && <p className="mx-auto mt-6 max-w-xs text-sm leading-6 text-muted">{project.description}</p>}</div></div>
    <JustifiedGallery images={images} />
    {relatedProjects.length > 0 && <section className="site-container mt-16 md:mt-24">
      <h2 className="mb-10 text-center font-sans text-xs font-bold uppercase tracking-editorial md:mb-14">You may also like</h2>
      <ProjectGrid projects={relatedProjects} compact />
    </section>}
  </main>;
}

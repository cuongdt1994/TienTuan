import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getPublishedProjects } from "@/lib/content";
import { JustifiedGallery } from "@/components/site/justified-gallery";
import { ProjectGrid } from "@/components/site/project-grid";

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export async function getProjectPageMetadata(slug: string): Promise<Metadata> {
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  const image = project.coverImage ?? project.images[0];
  return {
    title: `${project.title} — Tien Tuan Photography`,
    description: project.description ?? `${project.title} photography project.`,
    alternates: { canonical: `/${project.slug}` },
    openGraph: { title: project.title, description: project.description ?? undefined, images: image ? [image.largeUrl] : undefined },
  };
}

export async function ProjectPage({ slug }: { slug: string }) {
  const [project, publishedProjects] = await Promise.all([getProject(slug), getPublishedProjects()]);
  if (!project) notFound();
  const images = project.images.map((image) => ({ src: image.originalUrl, thumbnailSrc: image.originalUrl, alt: image.alt ?? `${project.title} - Photo ${String(image.sortOrder + 1).padStart(2, "0")}`, width: image.width, height: image.height }));
  const relatedProjects = shuffle(publishedProjects.filter((item) => item.slug !== project.slug)).slice(0, 4);
  return <main className="pb-20 pt-16 md:pb-32 md:pt-28">
    <div className="site-wide-container"><div className="mb-14 text-center md:mb-24"><h1 className="project-detail-title mx-auto max-w-[min(92vw,960px)]">{project.title}</h1>{project.description && <p className="mx-auto mt-6 max-w-xs text-sm leading-6 text-muted">{project.description}</p>}</div></div>
    <JustifiedGallery images={images} />
    {relatedProjects.length > 0 && <section className="site-container mt-16 md:mt-24">
      <h2 className="mb-10 text-center font-sans text-xs font-bold uppercase tracking-editorial md:mb-14">You may also like</h2>
      <ProjectGrid projects={relatedProjects} compact />
    </section>}
  </main>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/content";
import { Lightbox } from "@/components/site/lightbox";

export async function getProjectPageMetadata(slug: string): Promise<Metadata> {
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  const image = project.coverImage ?? project.images[0];
  return {
    title: `${project.title} — Tiến Tuấn Photography`,
    description: project.description ?? `${project.title} photography project.`,
    alternates: { canonical: `/${project.slug}` },
    openGraph: { title: project.title, description: project.description ?? undefined, images: image ? [image.largeUrl] : undefined },
  };
}

export async function ProjectPage({ slug }: { slug: string }) {
  const project = await getProject(slug);
  if (!project) notFound();
  const images = project.images.map((image) => ({ src: image.largeUrl, alt: image.alt ?? `${project.title} - Photo ${String(image.sortOrder + 1).padStart(2, "0")}`, width: image.width, height: image.height }));
  return <main className="mx-auto max-w-[1600px] px-5 pb-20 pt-16 md:px-10 md:pb-32 md:pt-28">
    <div className="mb-14 grid gap-10 md:mb-24 md:grid-cols-[1fr_280px] md:items-end"><div><h1 className="font-sans text-6xl font-normal leading-[.9] tracking-[-0.05em] md:text-8xl">{project.title}</h1></div>{project.description && <p className="max-w-xs text-sm leading-6 text-muted">{project.description}</p>}</div>
    <Lightbox images={images} />
  </main>;
}

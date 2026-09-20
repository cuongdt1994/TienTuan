import { getPublishedProjects } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";

export async function CategoryPage({ slug, title, showHeader = true }: { slug?: string; title: string; showHeader?: boolean }) {
  const projects = await getPublishedProjects(slug);
  return <main className={`site-wide-container pb-20 md:pb-32 ${showHeader ? "pt-16 md:pt-28" : "pt-12 md:pt-16"}`}>
    {showHeader && <div className="mb-14 md:mb-24">
      <h1 className="font-sans text-5xl font-normal tracking-[-0.04em] md:text-7xl">{title}</h1>
    </div>}
    <ProjectGrid projects={projects} />
  </main>;
}

import { getPublishedProjects } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";

export async function CategoryPage({ slug, title, showHeader = true }: { slug?: string; title: string; showHeader?: boolean }) {
  const projects = await getPublishedProjects(slug);
  return <main className={`mx-auto max-w-[1600px] px-5 pb-20 md:px-10 md:pb-32 ${showHeader ? "pt-16 md:pt-28" : "pt-12 md:pt-16"}`}>
    {showHeader && <div className="mb-14 flex items-end justify-between gap-5 md:mb-24">
      <h1 className="font-sans text-5xl font-normal tracking-[-0.04em] md:text-7xl">{title}</h1>
      <span className="pb-2 text-[10px] uppercase tracking-editorial text-muted">{String(projects.length).padStart(2, "0")} projects</span>
    </div>}
    <ProjectGrid projects={projects} />
  </main>;
}

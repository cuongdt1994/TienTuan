import type { ProjectWithMedia } from "@/lib/content";
import { ProjectCard } from "@/components/site/project-card";

export function ProjectGrid({ projects, featured = false }: { projects: ProjectWithMedia[]; featured?: boolean }) {
  if (!projects.length) return <div className="py-24 text-center text-sm text-muted">No projects yet.</div>;
  return <div className={`grid gap-x-4 gap-y-14 md:gap-x-6 md:gap-y-20 ${featured ? "md:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
    {projects.map((project, index) => <ProjectCard key={project.id} project={project} priority={index < 3} index={index} aspectRatio={featured ? "3 / 4" : "4 / 3"} />)}
  </div>;
}

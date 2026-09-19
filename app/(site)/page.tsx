import { getPublishedProjects } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await getPublishedProjects();
  return <main>
    <section className="mx-auto max-w-[1800px] px-5 pb-12 pt-12 md:px-10 md:pb-20 md:pt-16">
      <ProjectGrid projects={projects} featured />
    </section>
  </main>;
}

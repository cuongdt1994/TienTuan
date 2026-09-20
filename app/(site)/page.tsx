import { getPublishedProjects } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await getPublishedProjects();
  return <main>
    <section className="site-wide-container pb-12 pt-12 md:pb-20 md:pt-16">
      <ProjectGrid projects={projects} featured />
    </section>
  </main>;
}

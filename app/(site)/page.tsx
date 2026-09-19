import Link from "next/link";
import { getPublishedProjects } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await getPublishedProjects();
  return <main>
    <section className="mx-auto max-w-[1800px] px-5 pb-12 pt-12 md:px-10 md:pb-20 md:pt-16">
      <ProjectGrid projects={projects} featured />
      <Link href="/work" className="mt-12 block text-center text-[10px] uppercase tracking-editorial text-muted hover:text-ink lg:hidden">View all work ↗</Link>
    </section>
  </main>;
}

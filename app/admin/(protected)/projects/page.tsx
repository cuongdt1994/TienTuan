import Link from "next/link";
import { db } from "@/lib/db";
import { ProjectList } from "@/components/admin/project-list";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({ include: { category: true, coverImage: true, _count: { select: { images: true } } }, orderBy: { sortOrder: "asc" } });
  return <div className="p-5 md:p-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Archive</p><h1 className="mt-3 font-display text-6xl tracking-[-0.05em]">Projects</h1></div><Link href="/admin/projects/new" className="bg-ink px-5 py-3 text-center text-[10px] uppercase tracking-editorial text-paper">New project +</Link></div><div className="mt-14 overflow-x-auto"><ProjectList initialProjects={projects} />{!projects.length && <div className="py-16 text-sm text-muted">No projects yet. Create your first project.</div>}</div></div>;
}

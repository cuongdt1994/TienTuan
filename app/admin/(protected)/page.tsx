import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let stats = { projects: 0, published: 0, images: 0, categories: 0 };
  try {
    const [projects, published, images, categories] = await Promise.all([db.project.count(), db.project.count({ where: { status: "PUBLISHED" } }), db.image.count(), db.category.count()]);
    stats = { projects, published, images, categories };
  } catch {}
  return <div className="p-5 md:p-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Overview</p><h1 className="mt-3 font-display text-6xl tracking-[-0.05em]">Dashboard</h1></div><Link href="/admin/projects/new" className="bg-ink px-5 py-3 text-center text-[10px] uppercase tracking-editorial text-paper">New project +</Link></div><div className="mt-14 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">{[["Projects", stats.projects], ["Published", stats.published], ["Images", stats.images], ["Categories", stats.categories]].map(([label, value]) => <div key={label} className="bg-paper p-6"><p className="text-[10px] uppercase tracking-editorial text-muted">{label}</p><p className="mt-8 font-display text-5xl">{value}</p></div>)}</div><div className="mt-16 border-t border-line pt-5"><p className="text-sm text-muted">Keep the archive moving. Add a new project, refine the order, and publish when the story is ready.</p></div></div>;
}

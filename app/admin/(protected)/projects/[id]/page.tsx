import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProjectEditor } from "@/components/admin/project-editor";

export const dynamic = "force-dynamic";
export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [project, categories] = await Promise.all([db.project.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]); if (!project) notFound(); return <ProjectEditor project={project} categories={categories} coverImageId={project.coverImageId} />; }

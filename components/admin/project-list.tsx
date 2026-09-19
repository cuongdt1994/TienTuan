"use client";

import Link from "next/link";
import { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type Project = { id: string; title: string; slug: string; status: string; category: { name: string }; coverImage: { thumbnailUrl: string } | null; _count: { images: number } };

function SortableRow({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id });
  return <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="border-b border-line bg-paper"><td className="py-4"><div className="flex items-center gap-3"><button {...attributes} {...listeners} className="cursor-grab touch-none text-muted" aria-label={`Reorder ${project.title}`}><GripVertical size={15} /></button>{project.coverImage ? <img src={project.coverImage.thumbnailUrl} alt="" className="h-14 w-14 object-cover" /> : <div className="h-14 w-14 bg-fog" />}<div><p>{project.title}</p><p className="mt-1 text-xs text-muted">/{project.slug}</p></div></div></td><td className="py-4 text-muted">{project.category.name}</td><td className="py-4 text-muted">{project._count.images}</td><td className="py-4"><span className={`text-[10px] uppercase tracking-editorial ${project.status === "PUBLISHED" ? "text-emerald-700" : "text-muted"}`}>{project.status}</span></td><td className="py-4"><Link href={`/admin/projects/${project.id}`} className="text-[10px] uppercase tracking-editorial underline underline-offset-4">Edit</Link></td></tr>;
}

export function ProjectList({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  async function onDragEnd(event: DragEndEvent) { const { active, over } = event; if (!over || active.id === over.id) return; const oldIndex = projects.findIndex((item) => item.id === active.id); const newIndex = projects.findIndex((item) => item.id === over.id); const next = [...projects]; const [moved] = next.splice(oldIndex, 1); next.splice(newIndex, 0, moved); setProjects(next); await fetch("/api/admin/projects/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((item) => item.id) }) }); }
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={projects.map((project) => project.id)} strategy={verticalListSortingStrategy}><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-line text-[10px] uppercase tracking-editorial text-muted"><tr><th className="pb-4 font-normal">Project</th><th className="pb-4 font-normal">Category</th><th className="pb-4 font-normal">Images</th><th className="pb-4 font-normal">Status</th><th className="pb-4 font-normal">Action</th></tr></thead><tbody>{projects.map((project) => <SortableRow key={project.id} project={project} />)}</tbody></table></SortableContext></DndContext>;
}

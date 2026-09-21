"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PreviewLink } from "@/components/admin/preview-link";

type Project = { id: string; title: string; slug: string; status: string; category: { id: string; name: string; sortOrder: number }; coverImage: { thumbnailUrl: string } | null; coverPositionX: number; coverPositionY: number; _count: { images: number } };

function SortableRow({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id });
  return <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="border-b border-line bg-paper"><td className="py-4"><div className="flex items-center gap-3"><button {...attributes} {...listeners} className="cursor-grab touch-none text-muted" aria-label={`Reorder ${project.title}`}><GripVertical size={15} /></button>{project.coverImage ? <Image src={project.coverImage.thumbnailUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 object-cover" style={{ objectPosition: `${project.coverPositionX}% ${project.coverPositionY}%` }} /> : <div className="h-14 w-14 bg-fog" />}<div><p>{project.title}</p><p className="mt-1 text-xs text-muted">/{project.slug}</p></div></div></td><td className="py-4 text-muted">{project.category.name}</td><td className="py-4 text-muted">{project._count.images}</td><td className="py-4"><span className={`text-[10px] uppercase tracking-editorial ${project.status === "PUBLISHED" ? "text-emerald-700" : "text-muted"}`}>{project.status}</span></td><td className="py-4"><div className="flex items-center gap-4"><Link href={`/admin/projects/${project.id}`} className="text-[10px] uppercase tracking-editorial underline underline-offset-4">Edit</Link>{project.status !== "PUBLISHED" && <PreviewLink projectId={project.id} />}</div></td></tr>;
}

export function ProjectList({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [message, setMessage] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  async function onDragEnd(categoryId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const group = projects.filter((project) => project.category.id === categoryId);
    const oldIndex = group.findIndex((item) => item.id === active.id);
    const newIndex = group.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedGroup = [...group];
    const [moved] = reorderedGroup.splice(oldIndex, 1);
    reorderedGroup.splice(newIndex, 0, moved);
    const next = [...projects];
    let groupIndex = 0;
    for (let index = 0; index < next.length; index += 1) {
      if (next[index].category.id === categoryId) next[index] = reorderedGroup[groupIndex++];
    }
    setProjects(next);
    const response = await fetch("/api/admin/projects/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((item) => item.id) }) });
    if (!response.ok) {
      setProjects(projects);
      setMessage("Could not save project order.");
      return;
    }
    setMessage("Project order saved.");
    setTimeout(() => setMessage(""), 1800);
  }

  const groups = Array.from(new Map(projects.map((project) => [project.category.id, project.category])).values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ category, projects: projects.filter((project) => project.category.id === category.id) }));

  return <div className="space-y-14">
    {message && <p className="text-xs text-emerald-700">{message}</p>}
    {groups.map(({ category, projects: categoryProjects }) => <section key={category.id}>
      <div className="mb-5 flex items-baseline justify-between border-t border-line pt-5"><div><h2 className="text-sm font-semibold">{category.name}</h2><p className="mt-1 text-xs text-muted">{categoryProjects.length} project{categoryProjects.length === 1 ? "" : "s"}</p></div><span className="text-[10px] uppercase tracking-editorial text-muted">Drag to reorder</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => onDragEnd(category.id, event)}>
        <SortableContext items={categoryProjects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
          <table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-line text-[10px] uppercase tracking-editorial text-muted"><tr><th className="pb-4 font-normal">Project</th><th className="pb-4 font-normal">Category</th><th className="pb-4 font-normal">Images</th><th className="pb-4 font-normal">Status</th><th className="pb-4 font-normal">Action</th></tr></thead><tbody>{categoryProjects.map((project) => <SortableRow key={project.id} project={project} />)}</tbody></table>
        </SortableContext>
      </DndContext>
    </section>)}
  </div>;
}

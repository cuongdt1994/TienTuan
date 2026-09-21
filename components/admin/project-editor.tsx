"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Trash2 } from "lucide-react";
import { ProjectUploader } from "@/components/admin/project-uploader";
import { browserImageUrl } from "@/lib/media-url";
import { CoverPositionEditor } from "@/components/admin/cover-position-editor";

type Image = { id: string; thumbnailUrl: string; alt: string | null; sortOrder: number; width: number; height: number };
type Project = { id: string; title: string; slug: string; description: string | null; status: "DRAFT" | "PUBLISHED"; categoryId: string; coverPositionX: number; coverPositionY: number; images: Image[] };
type Category = { id: string; name: string };

function SortableImage({ image, index, onDelete, onCover, isCover }: { image: Image; index: number; onDelete: () => void; onCover: () => void; isCover: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative min-w-0 bg-paper">
    <div className="relative aspect-[4/3] overflow-hidden bg-fog">
      <Image src={browserImageUrl(image.thumbnailUrl)} alt={image.alt ?? ""} fill sizes="(max-width: 639px) 50vw, 240px" unoptimized className="object-contain" />
      <span className="absolute left-2 top-2 bg-white/90 px-2 py-1 text-[9px] uppercase tracking-editorial">{index + 1}</span>
      {isCover && <span className="absolute right-2 top-2 bg-white/90 px-2 py-1 text-[9px] uppercase tracking-editorial">Cover</span>}
    </div>
    <div className="flex items-center justify-between gap-2 p-2">
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-muted active:cursor-grabbing" aria-label={`Drag image ${index + 1} to reorder`}><GripVertical size={13} /></button>
      <button type="button" onClick={onCover} title="Set as cover" className={isCover ? "text-emerald-700" : "text-muted hover:text-ink"}><Check size={14} /></button>
      <button type="button" onClick={onDelete} title="Delete image" className="text-muted hover:text-red-600"><Trash2 size={14} /></button>
    </div>
  </div>;
}

export function ProjectEditor({ project: initialProject, categories, coverImageId }: { project: Project; categories: Category[]; coverImageId: string | null }) {
  const router = useRouter(); const [project, setProject] = useState(initialProject); const [images, setImages] = useState(initialProject.images); const [cover, setCover] = useState(coverImageId); const [message, setMessage] = useState(""); const [lastDeleted, setLastDeleted] = useState<Image | null>(null); const [lastDeletedWasCover, setLastDeletedWasCover] = useState(false); const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  async function update(data: Record<string, unknown>) { const response = await fetch(`/api/admin/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const result = await response.json().catch(() => ({})); if (response.ok) { setProject((current) => ({ ...current, ...result.project })); setMessage("Saved"); setTimeout(() => setMessage(""), 1800); } }
  async function reorder(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = images.findIndex((image) => image.id === event.active.id);
    const to = images.findIndex((image) => image.id === event.over!.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(images, from, to);
    setImages(next);
    const response = await fetch(`/api/admin/projects/${project.id}/images/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((image) => image.id) }) });
    if (!response.ok) {
      setImages(images);
      setMessage("Could not save image order");
      return;
    }
    setMessage("Image order saved");
    setTimeout(() => setMessage(""), 1800);
  }
  async function setCoverImage(id: string) { setCover(id); await fetch(`/api/admin/images/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover: true }) }); }
  async function saveCoverPosition(point: { x: number; y: number }) { await update({ coverPositionX: point.x, coverPositionY: point.y }); }
  async function deleteImage(id: string) { if (!window.confirm("Move this image to trash? You can undo it immediately.")) return; const target = images.find((image) => image.id === id); if (!target) return; const wasCover = cover === id; const response = await fetch(`/api/admin/images/${id}`, { method: "DELETE" }); if (!response.ok) { setMessage("Could not move image to trash"); return; } setImages((current) => current.filter((image) => image.id !== id)); if (wasCover) setCover(null); setLastDeleted(target); setLastDeletedWasCover(wasCover); setMessage("Image moved to trash"); }
  async function undoDelete() { if (!lastDeleted) return; const response = await fetch(`/api/admin/images/${lastDeleted.id}/restore`, { method: "POST" }); if (!response.ok) { setMessage("Could not restore image"); return; } setImages((current) => [...current, lastDeleted].sort((a, b) => a.sortOrder - b.sortOrder)); if (lastDeletedWasCover) setCover(lastDeleted.id); setLastDeleted(null); setMessage("Image restored"); }
  async function deleteProject() { if (!window.confirm("Delete this project and all its image files?")) return; const response = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" }); if (!response.ok) { setMessage("Could not delete project"); return; } router.push("/admin/projects"); }
  async function submit(event: FormEvent) { event.preventDefault(); await update({ title: project.title, slug: project.slug, description: project.description ?? "", categoryId: project.categoryId, status: project.status }); }
  const coverImage = images.find((image) => image.id === cover) ?? images[0] ?? null;
  return <div className="p-5 md:p-10"><div className="flex items-end justify-between gap-5"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Archive / Edit</p><h1 className="mt-3 font-sans text-6xl font-normal tracking-[-0.05em]">{project.title}</h1></div><button onClick={deleteProject} className="flex items-center gap-2 text-[10px] uppercase tracking-editorial text-red-600"><Trash2 size={13} />Delete</button></div><form onSubmit={submit} className="mt-14 max-w-4xl space-y-9"><div className="grid gap-8 md:grid-cols-2"><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Title</span><input value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} className="w-full border-b border-line bg-transparent py-3 outline-none focus:border-ink" /></label><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Slug</span><input value={project.slug} onChange={(event) => setProject({ ...project, slug: event.target.value })} className="w-full border-b border-line bg-transparent py-3 outline-none focus:border-ink" /></label></div><div className="grid gap-8 md:grid-cols-2"><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Category</span><select value={project.categoryId} onChange={(event) => setProject({ ...project, categoryId: event.target.value })} className="w-full border-b border-line bg-transparent py-3 outline-none focus:border-ink">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Description</span><input value={project.description ?? ""} onChange={(event) => setProject({ ...project, description: event.target.value })} className="w-full border-b border-line bg-transparent py-3 outline-none focus:border-ink" /></label></div><div className="flex items-center justify-between border-t border-line pt-5"><p className="text-[10px] uppercase tracking-editorial text-muted">{images.length} images</p><button type="button" onClick={() => update({ status: project.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })} className="text-[10px] uppercase tracking-editorial underline underline-offset-4">{project.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button></div><div className="border-t border-line pt-5"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Cover framing</p><p className="mt-2 text-xs text-muted">Chọn ảnh cover trong lưới bên dưới, sau đó kéo ảnh tại đây để chỉnh phần hiển thị.</p></div><div className="flex items-center gap-3">{message && <span className="text-xs text-emerald-700">{message}</span>}{lastDeleted && <button type="button" onClick={undoDelete} className="text-xs uppercase tracking-editorial underline underline-offset-4">Undo</button>}</div></div><div className="mt-5"><CoverPositionEditor image={coverImage} position={{ x: project.coverPositionX, y: project.coverPositionY }} onChange={(point) => setProject((current) => ({ ...current, coverPositionX: point.x, coverPositionY: point.y }))} onSave={saveCoverPosition} /></div></div><div className="border-t border-line pt-5"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Project layout</p><p className="mt-2 text-xs text-muted">Kéo biểu tượng tay nắm để đổi thứ tự. Thứ tự này sẽ đồng bộ ngay với project detail.</p></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}><SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image, index) => <SortableImage key={image.id} image={image} index={index} isCover={cover === image.id} onCover={() => setCoverImage(image.id)} onDelete={() => deleteImage(image.id)} />)}</div></SortableContext></DndContext></div><ProjectUploader projectId={project.id} onUploaded={(image) => { setImages((current) => [...current, image]); if (!cover) setCover(image.id); }} /><div className="flex items-center gap-4 border-t border-line pt-6"><button type="submit" className="bg-ink px-5 py-3 text-[10px] uppercase tracking-editorial text-paper">Save changes</button></div></form></div>;
}

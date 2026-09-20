"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MediaItem = {
  id: string;
  thumbnailUrl: string;
  originalUrl: string;
  alt: string | null;
  createdAt: string;
  project: { id: string; title: string; slug: string; category: { name: string } };
};

export function MediaLibrary({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [deleted, setDeleted] = useState<MediaItem | null>(null);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.project.category.name))).sort(), [items]);
  const visible = useMemo(() => items.filter((item) => {
    const haystack = `${item.alt ?? ""} ${item.project.title} ${item.project.category.name}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === "all" || item.project.category.name === category);
  }), [items, query, category]);

  async function trash(item: MediaItem) {
    if (!window.confirm("Move this image to trash? You can undo it immediately.")) return;
    const response = await fetch(`/api/admin/images/${item.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    setDeleted(item);
  }

  async function undo() {
    if (!deleted) return;
    const response = await fetch(`/api/admin/images/${deleted.id}/restore`, { method: "POST" });
    if (!response.ok) return;
    setItems((current) => [deleted, ...current]);
    setDeleted(null);
  }

  return <div className="mt-10">
    <div className="flex flex-col gap-3 border-y border-line py-4 md:flex-row">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project or category" className="min-w-0 flex-1 border-b border-line bg-transparent py-2 text-sm outline-none focus:border-ink" />
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="border-b border-line bg-transparent py-2 text-sm outline-none"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
    </div>
    {deleted && <div className="flex items-center justify-between border-b border-line py-3 text-xs"><span>Image moved to trash.</span><button type="button" onClick={undo} className="uppercase tracking-editorial underline underline-offset-4">Undo</button></div>}
    {!visible.length ? <div className="py-16 text-sm text-muted">No images match your search.</div> : <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visible.map((item) => <article key={item.id} className="group min-w-0"><div className="relative aspect-square overflow-hidden bg-fog"><img src={item.thumbnailUrl} alt={item.alt ?? item.project.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /><button type="button" onClick={() => trash(item)} className="absolute right-2 top-2 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-editorial opacity-0 transition group-hover:opacity-100">Trash</button></div><div className="pt-2"><Link href={`/admin/projects/${item.project.id}`} className="text-xs underline underline-offset-4">{item.project.title}</Link><p className="mt-1 text-[11px] text-muted">{item.project.category.name}</p></div></article>)}</div>}
  </div>;
}

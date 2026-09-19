"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; _count?: { projects: number } };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    setCategories(data.categories ?? []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Could not create category.");
      return;
    }
    setName("");
    load();
  }

  function beginEdit(category: Category) {
    setError("");
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setError("");
    const response = await fetch(`/api/admin/categories/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingName }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not update category.");
      return;
    }
    setEditingId(null);
    setEditingName("");
    load();
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    setError("");
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not delete category.");
      return;
    }
    load();
  }

  return <div className="p-5 md:p-10">
    <p className="text-[10px] uppercase tracking-editorial text-muted">Taxonomy</p>
    <h1 className="mt-3 font-display text-6xl tracking-[-0.05em]">Categories</h1>
    <form onSubmit={submit} className="mt-14 flex max-w-lg gap-3">
      <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" className="min-w-0 flex-1 border-b border-line bg-transparent py-3 text-sm outline-none focus:border-ink" />
      <button className="bg-ink px-5 py-3 text-[10px] uppercase tracking-editorial text-paper">Add</button>
    </form>
    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    <div className="mt-14 max-w-3xl divide-y divide-line border-t border-line">
      {categories.map((category) => <div key={category.id} className="py-4">
        {editingId === category.id ? <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-3">
          <input required autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} className="min-w-0 flex-1 border-b border-ink bg-transparent py-2 text-sm outline-none" />
          <button type="submit" className="bg-ink px-4 py-2 text-[10px] uppercase tracking-editorial text-paper">Save</button>
          <button type="button" onClick={() => setEditingId(null)} className="px-2 py-2 text-[10px] uppercase tracking-editorial text-muted">Cancel</button>
        </form> : <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm">{category.name}</p>
            <p className="mt-1 text-xs text-muted">/{category.slug} · {category._count?.projects ?? 0} project{category._count?.projects === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => beginEdit(category)} className="text-[10px] uppercase tracking-editorial text-muted hover:text-ink">Edit</button>
            <button type="button" onClick={() => deleteCategory(category)} className="text-[10px] uppercase tracking-editorial text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>}
      </div>)}
    </div>
  </div>;
}

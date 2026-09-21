"use client";

import { FormEvent, useEffect, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type Category = { id: string; name: string; slug: string; showOnHome: boolean; _count?: { projects: number } };

function SortableCategoryRow({ category, editingId, editingName, onBeginEdit, onNameChange, onSave, onCancel, onDelete, onToggleHome }: {
  category: Category;
  editingId: string | null;
  editingName: string;
  onBeginEdit: (category: Category) => void;
  onNameChange: (name: string) => void;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
  onDelete: (category: Category) => void;
  onToggleHome: (category: Category) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  const isEditing = editingId === category.id;

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="border-b border-line bg-paper py-4">
    <div className="flex flex-wrap items-center gap-4">
      <button {...attributes} {...listeners} type="button" className="cursor-grab touch-none text-muted active:cursor-grabbing" aria-label={`Reorder ${category.name}`}>
        <GripVertical size={16} />
      </button>
      {isEditing ? <form onSubmit={onSave} className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <input required autoFocus value={editingName} onChange={(event) => onNameChange(event.target.value)} className="min-w-0 flex-1 border-b border-ink bg-transparent py-2 text-sm outline-none" />
        <button type="submit" className="bg-ink px-4 py-2 text-[10px] uppercase tracking-editorial text-paper">Save</button>
        <button type="button" onClick={onCancel} className="px-2 py-2 text-[10px] uppercase tracking-editorial text-muted">Cancel</button>
      </form> : <>
        <div className="min-w-0 flex-1">
          <p className="text-sm">{category.name}</p>
          <p className="mt-1 text-xs text-muted">/{category.slug} · {category._count?.projects ?? 0} project{category._count?.projects === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onToggleHome(category)} className={`text-[10px] uppercase tracking-editorial ${category.showOnHome ? "text-ink" : "text-muted"}`}>
            {category.showOnHome ? "Home on" : "Home off"}
          </button>
          <button type="button" onClick={() => onBeginEdit(category)} className="text-[10px] uppercase tracking-editorial text-muted hover:text-ink">Edit</button>
          <button type="button" onClick={() => onDelete(category)} className="text-[10px] uppercase tracking-editorial text-red-600 hover:text-red-800">Delete</button>
        </div>
      </>}
    </div>
  </div>;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/categories")
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setCategories(data.categories ?? []); })
      .catch(() => { if (!cancelled) setError("Could not load categories."); });
    return () => { cancelled = true; };
  }, []);

  async function reorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((category) => category.id === active.id);
    const newIndex = categories.findIndex((category) => category.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...categories];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setCategories(next);
    const response = await fetch("/api/admin/categories/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((category) => category.id) }) });
    if (!response.ok) {
      setError("Could not save category order.");
      load();
    }
  }

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

  async function toggleHome(category: Category) {
    setError("");
    const response = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHome: !category.showOnHome }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not update Home visibility.");
      return;
    }
    setCategories((current) => current.map((item) => item.id === category.id ? { ...item, showOnHome: !category.showOnHome } : item));
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
      <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-14 max-w-3xl border-t border-line">
          {categories.map((category) => <SortableCategoryRow key={category.id} category={category} editingId={editingId} editingName={editingName} onBeginEdit={beginEdit} onNameChange={setEditingName} onSave={saveEdit} onCancel={() => setEditingId(null)} onDelete={deleteCategory} onToggleHome={toggleHome} />)}
        </div>
      </SortableContext>
    </DndContext>
  </div>;
}

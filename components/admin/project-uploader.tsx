"use client";

import { useState } from "react";
import { UploadCloud, X, GripVertical, LoaderCircle, CheckCircle2 } from "lucide-react";

type UploadItem = { id: string; name: string; preview: string; progress: number; status: "ready" | "uploading" | "done" | "error" };
type UploadedImage = { id: string; thumbnailUrl: string; alt: string | null; sortOrder: number };

export function ProjectUploader({ projectId, onUploaded }: { projectId: string; onUploaded?: (image: UploadedImage) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File, itemId: string) {
    try {
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, status: "uploading" } : item));
      const presignResponse = await fetch("/api/admin/upload/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
      if (!presignResponse.ok) throw new Error("Could not prepare upload");
      const { uploadUrl, objectKey } = await presignResponse.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (event) => event.lengthComputable && setItems((current) => current.map((item) => item.id === itemId ? { ...item, progress: Math.round((event.loaded / event.total) * 80) } : item));
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("MinIO upload failed"));
        xhr.onerror = () => reject(new Error("MinIO upload failed"));
        xhr.send(file);
      });
      const processResponse = await fetch(`/api/admin/projects/${projectId}/images/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey, filename: file.name, contentType: file.type }) });
      if (!processResponse.ok) throw new Error("Could not process image");
      const { image } = await processResponse.json();
      onUploaded?.(image);
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, progress: 100, status: "done" } : item));
    } catch {
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, status: "error" } : item));
    }
  }

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter((file) => file.type.startsWith("image/") && file.size <= 50 * 1024 * 1024);
    const newItems = valid.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, preview: URL.createObjectURL(file), progress: 0, status: "ready" as const }));
    setItems((current) => [...current, ...newItems]);
    newItems.forEach((item, index) => upload(valid[index], item.id));
  }

  return <section className="space-y-5">
    <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`flex min-h-48 cursor-pointer flex-col items-center justify-center border border-dashed ${dragging ? "border-ink bg-fog" : "border-line bg-paper"} p-8 text-center transition-colors`}>
      <UploadCloud size={24} strokeWidth={1.2} />
      <span className="mt-4 text-sm">Drop images here</span>
      <span className="mt-2 text-xs text-muted">JPEG, PNG, WebP or AVIF · up to 50MB each</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(event) => event.target.files && addFiles(event.target.files)} />
    </label>
    {!!items.length && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <div key={item.id} className="relative overflow-hidden bg-fog">
        <div className="relative aspect-square"><img src={item.preview} alt={item.name} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-black/10" />{item.status === "uploading" && <div className="absolute inset-0 flex items-center justify-center text-white"><LoaderCircle size={24} className="animate-spin" /></div>}{item.status === "done" && <CheckCircle2 size={18} className="absolute right-2 top-2 text-white" />}</div>
        <div className="flex items-center gap-1 bg-paper p-2 text-[10px]"><GripVertical size={12} className="text-muted" /><span className="truncate">{item.name}</span><button className="ml-auto" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} aria-label={`Remove ${item.name}`}><X size={13} /></button></div>
        <div className="h-0.5 bg-fog"><div className={`h-full ${item.status === "error" ? "bg-red-500" : "bg-ink"}`} style={{ width: `${item.progress}%` }} /></div>
      </div>)}
    </div>}
  </section>;
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, GripVertical, LoaderCircle, Pause, Play, RotateCcw, UploadCloud, X } from "lucide-react";
import { browserImageUrl } from "@/lib/media-url";

type UploadStatus = "ready" | "uploading" | "done" | "error";
type UploadItem = { id: string; name: string; file: File; preview: string; progress: number; status: UploadStatus; attempts: number; error?: string };
type UploadedImage = { id: string; thumbnailUrl: string; alt: string | null; sortOrder: number; width: number; height: number };

// Local uploads can safely keep a larger batch moving at once. The queue still
// preserves retry, pause/resume, cancellation, and per-file progress states.
const MAX_CONCURRENCY = 20;
const MAX_ATTEMPTS = 3;

export function ProjectUploader({ projectId, onUploaded }: { projectId: string; onUploaded?: (image: UploadedImage) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const queueRef = useRef<string[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const runningRef = useRef(0);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(new Set<string>());
  const xhrRef = useRef(new Map<string, XMLHttpRequest>());

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patch } : item);
      itemsRef.current = next;
      return next;
    });
  }

  async function waitUntilResumed() {
    while (pausedRef.current) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  async function uploadOnce(file: File, itemId: string) {
    const presignResponse = await fetch("/api/admin/upload/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
    if (!presignResponse.ok) throw new Error("Could not prepare upload");
    const { uploadUrl, objectKey } = await presignResponse.json();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current.set(itemId, xhr);
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) updateItem(itemId, { progress: Math.round((event.loaded / event.total) * 80) }); };
      xhr.onload = () => { xhrRef.current.delete(itemId); if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error("MinIO upload failed")); };
      xhr.onerror = () => { xhrRef.current.delete(itemId); reject(new Error("MinIO upload failed")); };
      xhr.onabort = () => { xhrRef.current.delete(itemId); reject(new Error("Upload cancelled")); };
      xhr.send(file);
    });
    const processResponse = await fetch(`/api/admin/projects/${projectId}/images/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey, filename: file.name, contentType: file.type }) });
    if (!processResponse.ok) throw new Error("Could not process image");
    return (await processResponse.json()).image as UploadedImage;
  }

  async function runUpload(item: UploadItem) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      await waitUntilResumed();
      if (cancelledRef.current.has(item.id)) return;
      updateItem(item.id, { status: "uploading", attempts: attempt, error: undefined });
      try {
        const image = await uploadOnce(item.file, item.id);
        if (cancelledRef.current.has(item.id)) return;
        onUploaded?.(image);
        updateItem(item.id, { progress: 100, status: "done", error: undefined });
        return;
      } catch (error) {
        if (cancelledRef.current.has(item.id)) return;
        if (attempt < MAX_ATTEMPTS) {
          updateItem(item.id, { status: "ready", error: `Retrying (${attempt + 1}/${MAX_ATTEMPTS})…` });
          await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
        } else {
          updateItem(item.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
        }
      }
    }
  }

  function pump() {
    if (pausedRef.current) return;
    while (runningRef.current < MAX_CONCURRENCY && queueRef.current.length) {
      const itemId = queueRef.current.shift();
      const item = itemId ? itemsRef.current.find((current) => current.id === itemId) : undefined;
      if (!item || cancelledRef.current.has(item.id)) continue;
      runningRef.current += 1;
      void runUpload(item).finally(() => { runningRef.current -= 1; pump(); });
    }
  }

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter((file) => file.type.startsWith("image/") && file.size <= 50 * 1024 * 1024);
    const newItems = valid.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, file, preview: URL.createObjectURL(file), progress: 0, status: "ready" as const, attempts: 0 }));
    itemsRef.current = [...itemsRef.current, ...newItems];
    setItems(itemsRef.current);
    queueRef.current.push(...newItems.map((item) => item.id));
    pump();
  }

  function togglePaused() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next) pump();
  }

  function retry(item: UploadItem) {
    cancelledRef.current.delete(item.id);
    updateItem(item.id, { status: "ready", progress: 0, error: undefined });
    queueRef.current.push(item.id);
    pump();
  }

  function remove(item: UploadItem) {
    cancelledRef.current.add(item.id);
    xhrRef.current.get(item.id)?.abort();
    queueRef.current = queueRef.current.filter((id) => id !== item.id);
    itemsRef.current = itemsRef.current.filter((current) => current.id !== item.id);
    setItems(itemsRef.current);
    URL.revokeObjectURL(item.preview);
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Upload tối đa 20 ảnh cùng lúc · tự động thử lại nếu lỗi.</p><button type="button" onClick={togglePaused} className="flex items-center gap-2 text-[10px] uppercase tracking-editorial underline underline-offset-4">{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? "Resume queue" : "Pause queue"}</button></div>
    <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`flex min-h-48 cursor-pointer flex-col items-center justify-center border border-dashed ${dragging ? "border-ink bg-fog" : "border-line bg-paper"} p-8 text-center transition-colors`}>
      <UploadCloud size={24} strokeWidth={1.2} />
      <span className="mt-4 text-sm">Drop images here</span>
      <span className="mt-2 text-xs text-muted">JPEG, PNG, WebP or AVIF · up to 50MB each</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(event) => event.target.files && addFiles(event.target.files)} />
    </label>
    {!!items.length && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((item) => <div key={item.id} className="relative overflow-hidden bg-fog">
      <div className="relative aspect-square"><Image src={browserImageUrl(item.preview)} alt={item.name} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" unoptimized className="object-cover" /><div className="absolute inset-0 bg-black/10" />{item.status === "uploading" && <div className="absolute inset-0 flex items-center justify-center text-white"><LoaderCircle size={24} className="animate-spin" /></div>}{item.status === "done" && <CheckCircle2 size={18} className="absolute right-2 top-2 text-white" />}</div>
      <div className="flex items-center gap-1 bg-paper p-2 text-[10px]"><GripVertical size={12} className="text-muted" /><span className="truncate">{item.name}</span>{item.status === "error" && <button type="button" onClick={() => retry(item)} title="Retry upload" className="ml-auto text-red-600"><RotateCcw size={13} /></button>}<button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.name}`} className="ml-1"><X size={13} /></button></div>
      <div className="h-0.5 bg-fog"><div className={`h-full ${item.status === "error" ? "bg-red-500" : "bg-ink"}`} style={{ width: `${item.progress}%` }} /></div>
      {item.error && <p className="truncate bg-paper px-2 pb-2 text-[10px] text-red-600">{item.error}</p>}
    </div>)}</div>}
  </section>;
}

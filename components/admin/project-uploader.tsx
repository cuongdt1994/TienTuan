"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, GripVertical, LoaderCircle, Pause, Play, RotateCcw, UploadCloud, X } from "lucide-react";
import { browserImageUrl } from "@/lib/media-url";
import { uploadAdminFile } from "@/components/admin/upload-client";

type UploadStatus = "ready" | "uploading" | "processing" | "done" | "error";
type UploadItem = { id: string; name: string; file: File; preview: string; progress: number; status: UploadStatus; attempts: number; error?: string };
type UploadedImage = { id: string; thumbnailUrl: string; alt: string | null; sortOrder: number; width: number; height: number };

// Local uploads can safely keep a larger batch moving at once. The queue still
// preserves retry, pause/resume, cancellation, and per-file progress states.
const MAX_CONCURRENCY = 3;
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
  const abortRef = useRef(new Map<string, AbortController>());

  useEffect(() => () => {
    for (const item of itemsRef.current) URL.revokeObjectURL(item.preview);
    for (const controller of abortRef.current.values()) controller.abort();
  }, []);

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
    const controller = new AbortController();
    abortRef.current.set(itemId, controller);
    const { objectKey } = await uploadAdminFile(file, (progress) => updateItem(itemId, { progress }), controller.signal);
    abortRef.current.delete(itemId);
    updateItem(itemId, { status: "processing", progress: 85 });
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
        abortRef.current.delete(item.id);
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
    abortRef.current.get(item.id)?.abort();
    abortRef.current.delete(item.id);
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
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.currentTarget.value = ""; }} />
    </label>
    {!!items.length && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((item) => <div key={item.id} className="relative overflow-hidden bg-fog">
      <div className="relative aspect-square"><Image src={browserImageUrl(item.preview)} alt={item.name} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" unoptimized className="object-cover" /><div className="absolute inset-0 bg-black/10" />{(item.status === "uploading" || item.status === "processing") && <div className="absolute inset-0 flex items-center justify-center text-white"><LoaderCircle size={24} className="animate-spin" /></div>}{item.status === "done" && <CheckCircle2 size={18} className="absolute right-2 top-2 text-white" />}</div>
      <div className="flex items-center gap-1 bg-paper p-2 text-[10px]"><GripVertical size={12} className="text-muted" /><span className="truncate">{item.name}</span>{item.status === "error" && <button type="button" onClick={() => retry(item)} title="Retry upload" className="ml-auto text-red-600"><RotateCcw size={13} /></button>}<button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.name}`} className="ml-1"><X size={13} /></button></div>
      <div className="h-0.5 bg-fog"><div className={`h-full ${item.status === "error" ? "bg-red-500" : "bg-ink"}`} style={{ width: `${item.progress}%` }} /></div>
      {item.error && <p className="truncate bg-paper px-2 pb-2 text-[10px] text-red-600">{item.error}</p>}
    </div>)}</div>}
  </section>;
}

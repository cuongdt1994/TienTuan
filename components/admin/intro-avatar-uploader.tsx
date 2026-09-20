"use client";

import { useRef, useState } from "react";
import { CircleUserRound, LoaderCircle, Trash2, UploadCloud } from "lucide-react";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function IntroAvatarUploader({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!allowedTypes.has(file.type) || file.size > 50 * 1024 * 1024) {
      setError("Use JPEG, PNG, WebP or AVIF up to 50MB.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const presignResponse = await fetch("/api/admin/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      if (!presignResponse.ok) throw new Error("Could not prepare upload");
      const { uploadUrl, objectKey } = await presignResponse.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round((event.loaded / event.total) * 80));
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("MinIO upload failed"));
        xhr.onerror = () => reject(new Error("MinIO upload failed"));
        xhr.send(file);
      });
      const processResponse = await fetch("/api/admin/settings/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey, filename: file.name, contentType: file.type }),
      });
      const data = await processResponse.json();
      if (!processResponse.ok) throw new Error(data.error ?? "Could not process avatar");
      onChange(data.avatarUrl);
      setProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Avatar upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError("");
    setRemoving(true);
    try {
      const response = await fetch("/api/admin/settings/avatar", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove avatar");
      onChange("");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove avatar");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-fog">
        {value ? <img src={value} alt="Intro avatar preview" className="h-full w-full object-cover" /> : <CircleUserRound className="absolute inset-0 m-auto text-muted" size={38} strokeWidth={1.2} />}
        {busy && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink/60 text-white"><LoaderCircle size={18} className="animate-spin" /><span className="text-[10px]">{progress}%</span></div>}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col items-start gap-3">
        <p className="text-sm">Intro avatar</p>
        <p className="text-xs font-normal text-muted">Upload a personal photo. It will be resized and shown on the opening screen.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || removing} className="flex items-center gap-2 bg-ink px-4 py-2 text-[10px] uppercase tracking-editorial text-paper disabled:opacity-50"><UploadCloud size={14} strokeWidth={1.5} />{busy ? "Uploading…" : "Upload avatar"}</button>
          {value && <button type="button" onClick={remove} disabled={busy || removing} className="flex items-center gap-2 px-2 py-2 text-[10px] uppercase tracking-editorial text-muted hover:text-red-600 disabled:opacity-50"><Trash2 size={14} strokeWidth={1.5} />{removing ? "Removing…" : "Remove"}</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

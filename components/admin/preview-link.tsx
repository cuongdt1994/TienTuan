"use client";

import { useState } from "react";

export function PreviewLink({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);

  async function openPreview() {
    const previewWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
    setLoading(true);
    const response = await fetch(`/api/admin/projects/${projectId}/preview`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (response.ok && data.previewUrl && previewWindow) previewWindow.location.href = data.previewUrl;
    else previewWindow?.close();
  }

  return <button type="button" onClick={openPreview} disabled={loading} className="text-[10px] uppercase tracking-editorial text-muted underline underline-offset-4 disabled:opacity-50">{loading ? "Opening…" : "Preview"}</button>;
}

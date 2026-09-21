"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { browserImageUrl } from "@/lib/media-url";

type CoverImage = { thumbnailUrl: string; alt: string | null };
type Point = { x: number; y: number };

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function CoverPositionEditor({ image, position, onChange, onSave }: { image: CoverImage | null; position: Point; onChange: (point: Point) => void; onSave: (point: Point) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return position;
    const bounds = frame.getBoundingClientRect();
    return { x: clamp(((event.clientX - bounds.left) / bounds.width) * 100), y: clamp(((event.clientY - bounds.top) / bounds.height) * 100) };
  }

  if (!image) return <div className="border border-dashed border-line p-8 text-sm text-muted">Upload an image to choose a cover.</div>;

  return <div className="grid gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-end">
    <div ref={frameRef} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); onChange(pointFromEvent(event)); }} onPointerMove={(event) => dragging && onChange(pointFromEvent(event))} onPointerUp={(event) => { const point = pointFromEvent(event); setDragging(false); onChange(point); onSave(point); }} className="relative aspect-[4/3] cursor-crosshair touch-none overflow-hidden bg-black">
      <Image src={browserImageUrl(image.thumbnailUrl)} alt={image.alt ?? "Cover image"} fill sizes="(max-width: 767px) 100vw, 420px" unoptimized className="select-none object-cover" style={{ objectPosition: `${position.x}% ${position.y}%` }} draggable={false} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgba(255,255,255,.55)_33.2%,rgba(255,255,255,.55)_33.7%,transparent_33.7%,transparent_66.3%,rgba(255,255,255,.55)_66.3%,rgba(255,255,255,.55)_66.8%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgba(255,255,255,.55)_33.2%,rgba(255,255,255,.55)_33.7%,transparent_33.7%,transparent_66.3%,rgba(255,255,255,.55)_66.3%,rgba(255,255,255,.55)_66.8%,transparent_66.8%)]" />
      <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.55)]" style={{ left: `${position.x}%`, top: `${position.y}%` }} />
    </div>
    <div><p className="text-sm">Drag the image to choose the visible area.</p><p className="mt-2 text-xs leading-6 text-muted">The same focal position is used for the cover on Home, Categories, and Admin. Current position: {position.x}% / {position.y}%.</p><button type="button" onClick={() => onSave(position)} className="mt-5 bg-ink px-5 py-3 text-[10px] uppercase tracking-editorial text-paper">Save cover position</button></div>
  </div>;
}

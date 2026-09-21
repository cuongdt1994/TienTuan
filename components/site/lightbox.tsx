"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = { src: string; thumbnailSrc?: string; alt: string; width: number; height: number };

export function Lightbox({ images, active, onClose, onPrevious, onNext }: {
  images: LightboxImage[];
  active: number | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const current = active === null ? null : images[active];

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [active, onClose, onNext, onPrevious]);

  useEffect(() => {
    if (active === null || images.length < 2) return;
    const next = images[(active + 1) % images.length];
    const previous = images[(active - 1 + images.length) % images.length];
    [next, previous].forEach((image) => {
      const preloaded = new window.Image();
      preloaded.decoding = "async";
      preloaded.src = image.src;
    });
  }, [active, images]);

  if (!current) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-8" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
    <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 p-2 text-white/80 transition hover:text-white" aria-label="Close lightbox"><X size={24} strokeWidth={1.2} /></button>
    <div
      className="relative max-h-[92svh] w-[95vw] max-w-[1200px]"
      style={{ aspectRatio: `${current.width} / ${current.height}`, touchAction: "none" }}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > 48) {
          if (delta < 0) onNext();
          else onPrevious();
        }
        touchStartX.current = null;
      }}
    >
      <Image src={current.src} alt={current.alt} fill sizes="95vw" className="object-contain" unoptimized priority />
      <button type="button" onClick={(event) => { event.stopPropagation(); onPrevious(); }} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 p-3 text-white/75 transition hover:text-white" aria-label="Previous image"><ChevronLeft size={28} strokeWidth={1.2} /></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onNext(); }} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 p-3 text-white/75 transition hover:text-white" aria-label="Next image"><ChevronRight size={28} strokeWidth={1.2} /></button>
    </div>
    <span className="absolute bottom-4 left-4 text-[10px] uppercase tracking-editorial text-white/65">{(active ?? 0) + 1} / {images.length}</span>
  </div>;
}

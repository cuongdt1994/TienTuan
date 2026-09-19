"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

type LightboxImage = { src: string; alt: string; width: number; height: number };

export function Lightbox({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const current = active === null ? null : images[active];

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((value) => value === null ? 0 : (value + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((value) => value === null ? 0 : (value - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [active, images.length]);

  return <>
    <div className="columns-1 gap-4 md:columns-2 md:gap-6">
      {images.map((image, index) => <button key={`${image.src}-${index}`} onClick={() => { setActive(index); setZoomed(false); }} className="group mb-4 block w-full break-inside-avoid text-left md:mb-6" aria-label={`Open ${image.alt}`}>
        <div className="relative overflow-hidden bg-fog" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.02]" />
        </div>
      </button>)}
    </div>
    {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button onClick={() => setActive(null)} className="absolute right-5 top-5 text-white" aria-label="Close lightbox"><X size={24} strokeWidth={1.2} /></button>
      <button onClick={() => setZoomed(!zoomed)} className="absolute bottom-5 right-5 text-white" aria-label={zoomed ? "Zoom out" : "Zoom in"}>{zoomed ? <ZoomOut size={21} strokeWidth={1.2} /> : <ZoomIn size={21} strokeWidth={1.2} />}</button>
      <button onClick={() => setActive((active! - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 text-white" aria-label="Previous image"><ChevronLeft size={28} strokeWidth={1.2} /></button>
      <div className={`relative h-[88vh] w-[86vw] transition-transform duration-300 ${zoomed ? "scale-[1.45]" : "scale-100"}`}>
        <Image src={current.src} alt={current.alt} fill sizes="90vw" className="object-contain" priority />
      </div>
      <button onClick={() => setActive((active! + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-white" aria-label="Next image"><ChevronRight size={28} strokeWidth={1.2} /></button>
      <span className="absolute bottom-5 left-5 text-[10px] uppercase tracking-editorial text-white/65">{(active ?? 0) + 1} / {images.length}</span>
    </div>}
  </>;
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

type LightboxImage = { src: string; alt: string; width: number; height: number };

export function Lightbox({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const current = active === null ? null : images[active];

  function goTo(index: number) {
    setActive((index + images.length) % images.length);
    setZoomed(false);
  }

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") { event.preventDefault(); goTo((active ?? 0) + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); goTo((active ?? 0) - 1); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [active, images.length]);

  return <>
    <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:gap-5 xl:grid-cols-4">
      {images.map((image, index) => <button key={`${image.src}-${index}`} onClick={() => { setActive(index); setZoomed(false); }} className="group block w-full text-left" aria-label={`Open ${image.alt}`}>
        <div className="overflow-hidden bg-fog">
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw" className="h-auto w-full object-contain transition duration-700 ease-out group-hover:scale-[1.02]" />
        </div>
      </button>)}
    </div>
    {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button onClick={() => setActive(null)} className="absolute right-5 top-5 text-white" aria-label="Close lightbox"><X size={24} strokeWidth={1.2} /></button>
      <button onClick={() => setZoomed(!zoomed)} className="absolute bottom-5 right-5 text-white" aria-label={zoomed ? "Zoom out" : "Zoom in"}>{zoomed ? <ZoomOut size={21} strokeWidth={1.2} /> : <ZoomIn size={21} strokeWidth={1.2} />}</button>
      <button onClick={() => goTo((active ?? 0) - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 text-white/75 transition hover:text-white" aria-label="Previous image"><ChevronLeft size={28} strokeWidth={1.2} /></button>
      <div
        className={`relative h-[88vh] w-[86vw] transition-transform duration-300 ${zoomed ? "scale-[1.45]" : "scale-100"}`}
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          if (Math.abs(delta) > 48) goTo((active ?? 0) + (delta < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
        style={{ touchAction: "none" }}
      >
        <Image src={current.src} alt={current.alt} fill sizes="90vw" className="object-contain" priority />
      </div>
      <button onClick={() => goTo((active ?? 0) + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-white/75 transition hover:text-white" aria-label="Next image"><ChevronRight size={28} strokeWidth={1.2} /></button>
      <span className="absolute bottom-5 left-5 text-[10px] uppercase tracking-editorial text-white/65">{(active ?? 0) + 1} / {images.length}</span>
    </div>}
  </>;
}

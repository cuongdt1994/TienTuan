"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type LightboxImage = { src: string; alt: string; width: number; height: number };

export function Lightbox({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const current = active === null ? null : images[active];

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const updateWidth = () => setGalleryWidth(gallery.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    const width = galleryWidth || 1400;
    const columns = width >= 1280 ? 4 : width >= 640 ? 3 : 2;
    const gap = width >= 768 ? 20 : 12;
    const grouped = Array.from({ length: Math.ceil(images.length / columns) }, (_, rowIndex) => images.slice(rowIndex * columns, (rowIndex + 1) * columns));
    if (!grouped.length) return [];
    const rowHeights = grouped.map((row) => {
      const ratioSum = row.reduce((sum, image) => sum + Math.max(image.width / image.height, 0.1), 0);
      return (width - gap * (row.length - 1)) / ratioSum;
    });
    const rowHeight = Math.min(...rowHeights, 360);

    return grouped.map((row) => ({ images: row, height: rowHeight }));
  }, [galleryWidth, images]);

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
    <div ref={galleryRef} className="space-y-3 md:space-y-5">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="flex min-w-0 gap-3 md:gap-5" style={{ height: row.height }}>
        {row.images.map((image) => {
          const ratio = Math.max(image.width / image.height, 0.1);
          const style = { flex: `0 0 ${ratio * row.height}px` };
          const index = images.indexOf(image);
          return <button key={`${image.src}-${index}`} onClick={() => { setActive(index); setZoomed(false); }} style={style} className="group relative block h-full min-w-0 overflow-hidden bg-paper text-left" aria-label={`Open ${image.alt}`}>
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.02]" />
          </button>;
        })}
      </div>)}
    </div>
    {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button onClick={() => setActive(null)} className="absolute right-5 top-5 text-white" aria-label="Close lightbox"><X size={24} strokeWidth={1.2} /></button>
      <button onClick={() => goTo((active ?? 0) - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 text-white/75 transition hover:text-white" aria-label="Previous image"><ChevronLeft size={28} strokeWidth={1.2} /></button>
      <div
        className={`relative h-[88vh] w-[86vw] transition-transform duration-300 ${zoomed ? "cursor-zoom-out scale-[1.45]" : "cursor-zoom-in scale-100"}`}
        role="button"
        tabIndex={0}
        aria-label={zoomed ? "Zoom out" : "Zoom in"}
        onClick={() => setZoomed((currentZoom) => !currentZoom)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setZoomed((currentZoom) => !currentZoom); } }}
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

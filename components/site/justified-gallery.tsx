"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/site/lightbox";

type GalleryItem = { image: LightboxImage; index: number };
type GalleryRow = { items: GalleryItem[]; height: number; isLast: boolean };

export function JustifiedGallery({ images, targetRowHeight = 240, gap = 12 }: { images: LightboxImage[]; targetRowHeight?: number; gap?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateWidth = () => setContainerWidth(container.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo<GalleryRow[]>(() => {
    const width = containerWidth || 1120;
    const responsiveTarget = width >= 1024 ? targetRowHeight : width >= 640 ? 200 : 170;
    const responsiveGap = width >= 1024 ? gap : Math.min(gap, 10);
    const completeRows: GalleryRow[] = [];
    let current: GalleryItem[] = [];
    let ratioSum = 0;

    images.forEach((image, index) => {
      current.push({ image, index });
      ratioSum += Math.max(image.width / image.height, 0.1);
      const rowHeight = (width - responsiveGap * (current.length - 1)) / ratioSum;

      if (current.length > 1 && rowHeight <= responsiveTarget) {
        completeRows.push({ items: current, height: rowHeight, isLast: false });
        current = [];
        ratioSum = 0;
      }
    });

    if (current.length) {
      const naturalHeight = (width - responsiveGap * (current.length - 1)) / ratioSum;
      completeRows.push({ items: current, height: Math.min(responsiveTarget, naturalHeight), isLast: true });
    }

    return completeRows;
  }, [containerWidth, gap, images, targetRowHeight]);

  function move(direction: number) {
    setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  }

  return <>
    <div ref={containerRef} className="space-y-2.5 lg:space-y-3">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="flex min-w-0 gap-2.5 lg:gap-3" style={{ height: row.height }}>
        {row.items.map(({ image, index }) => {
          const ratio = Math.max(image.width / image.height, 0.1);
          const style = { flex: row.isLast ? `0 0 ${ratio * row.height}px` : `${ratio} 1 0%` };
          return <button key={`${image.src}-${index}`} type="button" onClick={() => setActive(index)} style={style} className="group relative block h-full min-w-0 overflow-hidden bg-paper text-left" aria-label={`Open ${image.alt}`}>
            <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="100vw" className="block h-full w-full object-contain transition duration-300 ease-out group-hover:scale-[1.015]" />
          </button>;
        })}
      </div>)}
    </div>
    <Lightbox
      images={images}
      active={active}
      onClose={() => setActive(null)}
      onPrevious={() => move(-1)}
      onNext={() => move(1)}
    />
  </>;
}

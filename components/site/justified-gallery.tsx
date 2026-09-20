"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/site/lightbox";

type GalleryRow = {
  images: LightboxImage[];
  widths: number[];
  height: number;
};

function galleryGap(width: number) {
  if (width < 640) return 8;
  if (width < 1024) return 12;
  return 14;
}

function targetRowHeight(width: number) {
  if (width < 640) return width * 0.72;
  return Math.min(340, Math.max(240, width / 4.2));
}

function maxImagesPerRow(width: number) {
  if (width < 640) return 1;
  if (width < 1024) return 4;
  if (width < 1440) return 5;
  return 6;
}

function createRows(images: LightboxImage[], width: number): GalleryRow[] {
  if (!images.length) return [];
  const safeWidth = Math.max(width, 320);
  const gap = galleryGap(safeWidth);
  const target = targetRowHeight(safeWidth);
  const maxPerRow = maxImagesPerRow(safeWidth);
  const rows: LightboxImage[][] = [];
  let current: LightboxImage[] = [];
  let ratioSum = 0;

  for (const image of images) {
    const ratio = image.width > 0 && image.height > 0 ? image.width / image.height : 1;
    const nextCount = current.length + 1;
    const nextHeight = (safeWidth - gap * (nextCount - 1)) / (ratioSum + ratio);

    if (current.length > 0 && (current.length >= maxPerRow || nextHeight < target)) {
      rows.push(current);
      current = [];
      ratioSum = 0;
    }

    current.push(image);
    ratioSum += ratio;
  }
  if (current.length) rows.push(current);

  return rows.map((row, rowIndex) => {
    const ratios = row.map((image) => image.width > 0 && image.height > 0 ? image.width / image.height : 1);
    const sum = ratios.reduce((total, ratio) => total + ratio, 0);
    const naturalHeight = (safeWidth - gap * (row.length - 1)) / sum;
    const isLastRow = rowIndex === rows.length - 1;
    const height = isLastRow && safeWidth >= 640 && row.length < 3 ? Math.min(naturalHeight, target) : naturalHeight;
    return { images: row, widths: ratios.map((ratio) => ratio * height), height };
  });
}

export function JustifiedGallery({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = galleryRef.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => createRows(images, width || 1120), [images, width]);
  const gap = galleryGap(width || 1120);
  const imageIndexes = useMemo(() => {
    let index = 0;
    return rows.map((row) => row.images.map(() => index++));
  }, [rows]);

  function move(direction: number) {
    setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  }

  return <>
    <div className="site-wide-container">
      <div ref={galleryRef} className="project-detail-gallery" style={{ gap }}>
        {rows.map((row, rowIndex) => <div key={`row-${rowIndex}`} className="project-detail-row" style={{ gap, height: row.height, gridTemplateColumns: row.widths.map((itemWidth) => `${itemWidth}px`).join(" ") }}>
          {row.images.map((image, index) => {
            const imageIndex = imageIndexes[rowIndex][index];
            return <button key={`${image.src}-${imageIndex}`} type="button" onClick={() => setActive(imageIndex)} className="group relative min-w-0 overflow-hidden bg-paper text-left" aria-label={`Open ${image.alt}`}>
              <Image
                src={image.thumbnailSrc ?? image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                quality={90}
                className="object-contain transition duration-300 ease-out group-hover:scale-[1.01]"
              />
            </button>;
          })}
        </div>)}
      </div>
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

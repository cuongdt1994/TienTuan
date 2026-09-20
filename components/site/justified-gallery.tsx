"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Lightbox, type LightboxImage } from "@/components/site/lightbox";

export function JustifiedGallery({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const desktopColumns = images.length < 3 ? images.length : Math.ceil(images.length / 2);
  const galleryStyle = { "--gallery-columns": desktopColumns } as CSSProperties & { "--gallery-columns": number };

  function move(direction: number) {
    setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  }

  return <>
    <div className="project-detail-gallery mx-auto grid w-full max-w-[1120px] gap-4 lg:gap-5" style={galleryStyle}>
      {images.map((image, index) => <button key={`${image.src}-${index}`} type="button" onClick={() => setActive(index)} className="group relative aspect-[3/4] w-full overflow-hidden bg-paper text-left" aria-label={`Open ${image.alt}`}>
        <Image
          src={image.thumbnailSrc ?? image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 450px, (min-width: 768px) 45vw, 100vw"
          className="object-cover object-center transition duration-300 ease-out group-hover:scale-[1.015]"
        />
      </button>)}
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

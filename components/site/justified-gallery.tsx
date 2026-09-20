"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/site/lightbox";

export function JustifiedGallery({ images }: { images: LightboxImage[] }) {
  const [active, setActive] = useState<number | null>(null);

  function move(direction: number) {
    setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  }

  return <>
    <div className="mx-auto grid w-full grid-cols-1 gap-x-4 gap-y-14 md:grid-cols-2 md:gap-x-6 md:gap-y-20 lg:grid-cols-3">
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

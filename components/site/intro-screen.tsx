"use client";

import Image from "next/image";
import { Facebook, Instagram } from "lucide-react";
import { useState } from "react";

type IntroScreenProps = {
  name: string;
  avatarUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

export function IntroScreen({ name, avatarUrl, instagram, facebook }: IntroScreenProps) {
  const [entering, setEntering] = useState(false);

  function openPortfolio() {
    setEntering(true);
    document.cookie = "portfolio_intro_seen=1; Path=/; Max-Age=2592000; SameSite=Lax";
    window.location.assign("/");
  }

  return (
    <main className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto bg-paper text-ink">
      <div className="mx-auto flex min-h-svh w-full max-w-[1440px] items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="grid w-full max-w-[920px] items-center gap-10 md:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] md:gap-14 lg:gap-16">
          <div className="mx-auto w-full max-w-[230px] animate-fade-in md:max-w-[300px]">
            <div className="relative aspect-square overflow-hidden rounded-full bg-fog">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${name} avatar`}
                  fill
                  priority
                  sizes="(max-width: 767px) 70vw, 420px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-10 text-center font-brand text-5xl">{name}</div>
              )}
            </div>
          </div>

          <div className="min-w-0 animate-fade-up text-center md:text-left">
            <p className="text-[11px] uppercase tracking-editorial text-muted">{name}</p>
            <div className="relative mt-4 inline-block">
              <h1 className="whitespace-nowrap text-[clamp(3.25rem,5.8vw,5rem)] font-black uppercase leading-[0.84] tracking-[-0.08em]">Portfolio</h1>
              <div className="absolute left-[48%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 bg-paper px-1.5" aria-label="Social links">
              {instagram && (
                <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-ink/80 transition-all duration-200 hover:scale-110 hover:text-ink">
                  <Instagram size={15} strokeWidth={1.8} />
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="text-ink/80 transition-all duration-200 hover:scale-110 hover:text-ink">
                  <Facebook size={15} strokeWidth={1.8} />
                </a>
              )}
              </div>
            </div>
            <button
              type="button"
              onClick={openPortfolio}
              disabled={entering}
              className="mt-7 inline-flex h-10 min-w-[104px] items-center justify-center rounded-full border border-ink/60 px-6 text-[9px] uppercase tracking-[0.18em] shadow-[0_5px_16px_rgba(23,23,22,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-ink hover:text-paper hover:shadow-[0_8px_20px_rgba(23,23,22,0.09)] disabled:opacity-50"
            >
              {entering ? "Opening" : "Open"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

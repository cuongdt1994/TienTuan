"use client";

import Image from "next/image";
import { Facebook, Instagram, ArrowUpRight } from "lucide-react";
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
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-paper text-ink">
      <div className="mx-auto flex min-h-svh w-full max-w-[1440px] items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid w-full max-w-[980px] items-center gap-12 md:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)] md:gap-16 lg:gap-24">
          <div className="mx-auto w-full max-w-[420px] animate-fade-in">
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

          <div className="animate-fade-up text-center md:text-left">
            <p className="text-[11px] uppercase tracking-editorial text-muted">{name}</p>
            <h1 className="mt-5 text-[clamp(4rem,11vw,9rem)] font-black uppercase leading-[0.82] tracking-[-0.08em]">Portfolio</h1>
            <div className="mt-10 flex items-center justify-center gap-5 md:justify-start" aria-label="Social links">
              {instagram && (
                <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="transition-opacity hover:opacity-50">
                  <Instagram size={22} strokeWidth={1.6} />
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="transition-opacity hover:opacity-50">
                  <Facebook size={22} strokeWidth={1.6} />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={openPortfolio}
              disabled={entering}
              className="mt-10 inline-flex items-center gap-3 border-b border-ink pb-2 text-[11px] uppercase tracking-editorial transition-opacity hover:opacity-50 disabled:opacity-50"
            >
              {entering ? "Opening" : "Open"}
              <ArrowUpRight size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

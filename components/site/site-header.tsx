"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type HeaderCategory = { name: string; slug: string };

export function SiteHeader({ name, categories }: { name: string; categories: HeaderCategory[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const showBrand = pathname !== "/contact";
  const links = [
    ...categories
      .filter((category) => ["commercial", "beauty", "portrait"].includes(category.slug))
      .map((category) => [category.name, `/${category.slug}`] as const),
    ["Contact", "/contact"] as const,
  ];
  return (
    <header className="relative z-40 bg-paper/95 backdrop-blur-sm">
      <div className="site-container relative flex items-center justify-between py-6 md:py-8 lg:justify-start">
        {showBrand && <Link href="/" className="font-brand text-[1.7rem] leading-none tracking-[-0.04em] md:text-[2rem] lg:absolute lg:left-1/2 lg:-translate-x-1/2">{name}</Link>}
        <nav className="hidden items-center gap-7 font-sans text-[11px] font-bold uppercase tracking-editorial text-ink lg:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href} className="font-sans font-bold transition-colors hover:text-muted">{label}</Link>)}
        </nav>
        <button aria-label={open ? "Close menu" : "Open menu"} className="ml-auto lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={22} strokeWidth={1.3} /> : <Menu size={22} strokeWidth={1.3} />}
        </button>
      </div>
      {open && (
        <nav className="absolute inset-x-0 top-full border-b border-line bg-paper px-4 pb-7 pt-2 font-sans lg:hidden" aria-label="Mobile navigation">
          {links.map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href} className="block border-t border-line py-4 text-xs font-bold uppercase tracking-editorial">{label}</Link>)}
        </nav>
      )}
    </header>
  );
}

import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";
import { MenuIcon } from "@/components/site/ui-icons";

type HeaderCategory = { name: string; slug: string };

export function SiteHeader({ name, categories, facebook, instagram }: { name: string; categories: HeaderCategory[]; facebook?: string | null; instagram?: string | null }) {
  const links = [
    ...categories.map((category) => [category.name, `/${category.slug}`] as const),
    ["Contact", "/contact"] as const,
  ];
  const socialLinks = <>
    {instagram && <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-ink/70 transition-colors hover:text-ink"><InstagramIcon size={16} strokeWidth={1.6} /></a>}
    {facebook && <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="text-ink/70 transition-colors hover:text-ink"><FacebookIcon size={16} strokeWidth={1.6} /></a>}
  </>;
  return (
    <header className="relative z-40 bg-paper/95 backdrop-blur-sm">
      <div className="site-wide-container relative flex min-h-[72px] items-center justify-between py-5 md:min-h-[80px] md:py-6 lg:justify-start">
        <Link href="/" className="font-brand text-[1.7rem] leading-none tracking-[-0.04em] md:text-[2rem] lg:absolute lg:left-1/2 lg:-translate-x-1/2">{name}</Link>
        <nav className="hidden items-center gap-7 font-sans text-[11px] font-bold uppercase tracking-editorial text-ink lg:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href} className="font-sans font-bold transition-colors hover:text-muted">{label}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-4 lg:flex" aria-label="Social links">{socialLinks}</div>
        <div className="ml-auto flex items-center gap-4 lg:hidden">
          <div className="flex items-center gap-3" aria-label="Social links">{socialLinks}</div>
          <details className="relative ml-1">
            <summary aria-label="Open menu" className="list-none cursor-pointer [&::-webkit-details-marker]:hidden"><MenuIcon size={22} strokeWidth={1.3} /></summary>
            <nav className="absolute right-0 top-[calc(100%+1.25rem)] z-50 w-[min(80vw,280px)] border-b border-line bg-paper px-5 pb-3 pt-1 shadow-[0_12px_28px_rgba(23,23,22,.08)]" aria-label="Mobile navigation">
              {links.map(([label, href]) => <Link key={href} href={href} className="block border-t border-line py-4 text-xs font-bold uppercase tracking-editorial">{label}</Link>)}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

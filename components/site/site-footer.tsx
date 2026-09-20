import { ScrollToTop } from "@/components/site/scroll-to-top";

export function SiteFooter({ name, email, instagram }: { name: string; email?: string | null; instagram?: string | null }) {
  return (
    <footer className="site-wide-container site-footer">
      <div className="editorial-rule flex flex-col justify-between gap-6 py-5 text-[10px] uppercase tracking-editorial text-muted sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} <span className="font-brand">{name}</span></span>
        <div className="flex items-center gap-6">
          {email && <a href={`mailto:${email}`} className="hover:text-ink">Email</a>}
          {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-ink">Instagram</a>}
          <ScrollToTop />
        </div>
      </div>
    </footer>
  );
}

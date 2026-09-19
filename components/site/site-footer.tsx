import { ScrollToTop } from "@/components/site/scroll-to-top";

export function SiteFooter({ name, email, instagram }: { name: string; email?: string | null; instagram?: string | null }) {
  return (
    <footer className="mx-auto max-w-[1600px] px-5 pb-8 pt-24 md:px-10 md:pt-36">
      <div className="editorial-rule flex flex-col justify-between gap-10 pt-5 text-[10px] uppercase tracking-editorial text-muted md:flex-row">
        <span>© {new Date().getFullYear()} {name}</span>
        <div className="flex gap-6">
          {email && <a href={`mailto:${email}`} className="hover:text-ink">Email</a>}
          {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-ink">Instagram</a>}
        </div>
      </div>
      <div className="flex justify-end pt-8">
        <ScrollToTop />
      </div>
    </footer>
  );
}

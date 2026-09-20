import { getCategories, getSettings } from "@/lib/content";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return <div className="site-shell"><SiteHeader name={settings.photographerName} categories={categories} /><div className="site-content">{children}</div><SiteFooter name={settings.photographerName} email={settings.email} instagram={settings.instagram} /></div>;
}

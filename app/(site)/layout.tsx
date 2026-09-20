import { getCategories, getSettings } from "@/lib/content";
import { SiteHeader } from "@/components/site/site-header";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return <div className="site-shell"><SiteHeader name={settings.photographerName} categories={categories} facebook={settings.facebook} instagram={settings.instagram} /><div className="site-content">{children}</div></div>;
}

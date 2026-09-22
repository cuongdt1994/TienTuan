import { getCategories, getSettings } from "@/lib/content";
import { SiteHeader } from "@/components/site/site-header";
import { SiteStructuredData } from "@/components/site/structured-data";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return <div className="site-shell"><SiteStructuredData name={settings.photographerName} description={settings.websiteDescription} facebook={settings.facebook} instagram={settings.instagram} /><SiteHeader name={settings.photographerName} categories={categories} facebook={settings.facebook} instagram={settings.instagram} /><div className="site-content">{children}</div></div>;
}

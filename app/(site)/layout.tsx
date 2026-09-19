import { getSettings } from "@/lib/content";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return <><SiteHeader name={settings.photographerName} />{children}<SiteFooter name={settings.photographerName} email={settings.email} instagram={settings.instagram} /></>;
}

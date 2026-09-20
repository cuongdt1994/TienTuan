import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    title: settings.websiteTitle,
    description: settings.websiteDescription,
    metadataBase: new URL(base),
    openGraph: { title: settings.websiteTitle, description: settings.websiteDescription, type: "website", siteName: settings.photographerName, url: base },
    twitter: { card: "summary_large_image", title: settings.websiteTitle, description: settings.websiteDescription },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

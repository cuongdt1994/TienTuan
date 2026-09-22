import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = getSiteUrl();
  const title = settings.websiteTitle || `${settings.photographerName} — Photography`;
  const description = settings.websiteDescription || "Editorial photography for culture, fashion, and people.";
  return {
    title: { default: title, template: `%s | ${settings.photographerName}` },
    description,
    metadataBase: new URL(base),
    applicationName: settings.photographerName,
    authors: [{ name: settings.photographerName, url: base }],
    keywords: ["Tien Tuan Photography", "photographer", "editorial photography", "commercial photography", "portrait photography"],
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "vi_VN",
      siteName: settings.photographerName,
      url: base,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

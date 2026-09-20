import { getSettings } from "@/lib/content";
import {
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

export const metadata = {
  title: "Contact — Tien Tuan Photography",
};
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <main className="site-container flex min-h-[calc(100svh-120px)] items-center justify-center py-10 md:py-12">
      <div className="w-full -translate-y-8 md:-translate-y-12">
        {/* Title */}
        <header className="text-center">
          <h1 className="font-sans text-[52px] font-normal leading-[0.95] tracking-[-0.06em] sm:text-[64px] md:text-[82px] lg:text-[92px]">
            Contact For Work
          </h1>
        </header>

        {/* Contact info */}
        <div className="mx-auto mt-16 grid w-full max-w-[680px] grid-cols-1 gap-14 sm:mt-20 sm:grid-cols-[260px_260px] sm:justify-center sm:gap-24 md:mt-24">
          {/* Inquiries */}
          <section className="w-full">
            <p className="mb-8 text-left text-[11px] font-normal uppercase tracking-[0.18em] text-muted">
              Inquiries
            </p>

            <div className="space-y-5">
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="grid grid-cols-[22px_1fr] items-center gap-5 text-left text-[15px] transition-opacity hover:opacity-60 sm:text-base"
                >
                  <Mail
                    size={20}
                    strokeWidth={1.7}
                    color="#EA4335"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">
                    {settings.email}
                  </span>
                </a>
              )}

              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="grid grid-cols-[22px_1fr] items-center gap-5 text-left text-[15px] transition-opacity hover:opacity-60 sm:text-base"
                >
                  <Phone
                    size={20}
                    strokeWidth={1.7}
                    color="#16A34A"
                    aria-hidden="true"
                  />
                  <span>{settings.phone}</span>
                </a>
              )}

              {settings.zalo && (
                <div className="grid grid-cols-[22px_1fr] items-center gap-5 text-left text-[15px] sm:text-base">
                  <MessageCircle
                    size={20}
                    strokeWidth={1.7}
                    color="#0068FF"
                    aria-hidden="true"
                  />
                  <span>Zalo / {settings.zalo}</span>
                </div>
              )}
            </div>
          </section>

          {/* Social */}
          <section className="w-full">
            <p className="mb-8 text-left text-[11px] font-normal uppercase tracking-[0.18em] text-muted">
              Social
            </p>

            <div className="space-y-5">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[22px_1fr] items-center gap-5 text-left text-[15px] transition-opacity hover:opacity-60 sm:text-base"
                >
                  <Instagram
                    size={20}
                    strokeWidth={1.7}
                    color="#E4405F"
                    aria-hidden="true"
                  />
                  <span>Instagram ↗</span>
                </a>
              )}

              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[22px_1fr] items-center gap-5 text-left text-[15px] transition-opacity hover:opacity-60 sm:text-base"
                >
                  <Facebook
                    size={20}
                    strokeWidth={1.7}
                    color="#1877F2"
                    aria-hidden="true"
                  />
                  <span>Facebook ↗</span>
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

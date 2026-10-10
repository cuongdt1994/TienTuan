import { getSettings } from "@/lib/content";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";
import { MailIcon, MessageCircleIcon, PhoneIcon } from "@/components/site/ui-icons";

export const metadata = {
  title: "Contact For Work",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <main className="contact-main">
      <div className="contact-stage">
        <header className="contact-title-wrap">
          <h1 className="contact-title">Contact For Work</h1>
        </header>

        <div className="contact-details">
          <section className="contact-column" aria-labelledby="inquiries-heading">
            <p id="inquiries-heading" className="contact-heading">Inquiries</p>

            <div className="contact-items">
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="contact-item contact-email">
                  <MailIcon size={20} strokeWidth={1.8} />
                  <span>{settings.email}</span>
                </a>
              )}

              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="contact-item">
                  <PhoneIcon size={20} strokeWidth={1.8} />
                  <span>{settings.phone}</span>
                </a>
              )}

              {settings.zalo && (
                <div className="contact-item">
                  <MessageCircleIcon size={20} strokeWidth={1.8} />
                  <span>Zalo / {settings.zalo}</span>
                </div>
              )}
            </div>
          </section>

          <section className="contact-column" aria-labelledby="social-heading">
            <p id="social-heading" className="contact-heading">Social</p>

            <div className="contact-items">
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="contact-item contact-link">
                  <InstagramIcon size={20} strokeWidth={1.8} />
                  <span>Instagram</span>
                </a>
              )}

              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="contact-item contact-link">
                  <FacebookIcon size={20} strokeWidth={1.8} />
                  <span>Facebook</span>
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

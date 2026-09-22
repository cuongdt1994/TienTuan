import { cookies } from "next/headers";
import { getPublishedProjects } from "@/lib/content";
import { getSettings } from "@/lib/content";
import { ProjectGrid } from "@/components/site/project-grid";
import { IntroScreen } from "@/components/site/intro-screen";
import { browserImageUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, settings] = await Promise.all([getPublishedProjects(), getSettings()]);
  const homeProjects = projects.filter((project) => project.category.showOnHome);
  const introSeen = (await cookies()).get("portfolio_intro_seen")?.value === "1";

  const fallbackAvatar = settings.introAvatarUrl ? browserImageUrl(settings.introAvatarUrl) : homeProjects[0]?.coverImage?.largeUrl ? browserImageUrl(homeProjects[0].coverImage.largeUrl) : homeProjects[0]?.images[0]?.largeUrl ? browserImageUrl(homeProjects[0].images[0].largeUrl) : undefined;

  return <>
    <main>
      <h1 className="sr-only">{settings.photographerName} — Photography Portfolio</h1>
      <section className="site-wide-container pb-12 pt-12 md:pb-20 md:pt-16">
        <ProjectGrid projects={homeProjects} />
      </section>
    </main>
    {settings.introEnabled && !introSeen && <IntroScreen name={settings.photographerName} avatarUrl={fallbackAvatar} instagram={settings.instagram} facebook={settings.facebook} />}
  </>;
}

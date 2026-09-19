import type { Metadata } from "next";
import { getProjectPageMetadata, ProjectPage } from "@/components/site/project-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return getProjectPageMetadata((await params).slug);
}

export default async function ProjectSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ProjectPage slug={(await params).slug} />;
}

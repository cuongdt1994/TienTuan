import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreviewProject } from "@/lib/content";
import { getProjectPageMetadata, ProjectPage } from "@/components/site/project-page";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { token?: string | string[] };

function readToken(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { slug } = await params;
  const token = readToken((await searchParams).token);
  if (!token) return { title: "Preview unavailable", robots: { index: false, follow: false } };
  return { ...(await getProjectPageMetadata(slug, token)), robots: { index: false, follow: false } };
}

export default async function ProjectPreviewPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const token = readToken((await searchParams).token);
  if (!token || !(await getPreviewProject(slug, token))) notFound();
  return <ProjectPage slug={slug} previewToken={token} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/site/category-page";
import { getProjectPageMetadata, ProjectPage } from "@/components/site/project-page";
import { getCategoryBySlug, getProject } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const project = await getProject(slug);
  if (project) return getProjectPageMetadata(slug);

  const category = await getCategoryBySlug(slug);
  if (category) {
    return {
      title: category.name,
      alternates: { canonical: `/${category.slug}` },
    };
  }

  return { title: "Page not found" };
}

export default async function ProjectSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const project = await getProject(slug);
  if (project) return <ProjectPage slug={slug} />;

  const category = await getCategoryBySlug(slug);
  if (category) return <CategoryPage slug={category.slug} title={category.name} />;

  notFound();
}

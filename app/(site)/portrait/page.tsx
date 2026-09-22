import { getCategoryBySlug } from "@/lib/content";
import { CategoryPage } from "@/components/site/category-page";
export const metadata = { title: "Portrait", alternates: { canonical: "/portrait" } };
export const dynamic = "force-dynamic";
export default async function PortraitPage() { const category = await getCategoryBySlug("portrait"); return <CategoryPage slug="portrait" title={category?.name ?? "Portrait"} />; }

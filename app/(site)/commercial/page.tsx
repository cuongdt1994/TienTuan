import { getCategoryBySlug } from "@/lib/content";
import { CategoryPage } from "@/components/site/category-page";
export const metadata = { title: "Commercial & KV — Tiến Tuấn Photography" };
export const dynamic = "force-dynamic";
export default async function CommercialPage() { const category = await getCategoryBySlug("commercial"); return <CategoryPage slug="commercial" title={category?.name ?? "Commercial & KV"} />; }

import { getCategoryBySlug } from "@/lib/content";
import { CategoryPage } from "@/components/site/category-page";
export const metadata = { title: "Beauty — Tien Tuan Photography" };
export const dynamic = "force-dynamic";
export default async function BeautyPage() { const category = await getCategoryBySlug("beauty"); return <CategoryPage slug="beauty" title={category?.name ?? "Beauty"} />; }

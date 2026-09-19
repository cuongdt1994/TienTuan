import type { Metadata } from "next";
import { CategoryPage } from "@/components/site/category-page";

export const metadata: Metadata = { title: "Work — Tiến Tuấn Photography" };
export const dynamic = "force-dynamic";
export default function WorkPage() { return <CategoryPage title="Work" showHeader={false} />; }

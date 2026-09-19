import type { Route } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  redirect(`/${(await params).slug}` as Route);
}

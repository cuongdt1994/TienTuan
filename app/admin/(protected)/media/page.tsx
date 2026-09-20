import { db } from "@/lib/db";
import { MediaLibrary } from "@/components/admin/media-library";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await db.image.findMany({
    where: { deletedAt: null },
    select: { id: true, thumbnailUrl: true, originalUrl: true, alt: true, createdAt: true, project: { select: { id: true, title: true, slug: true, category: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return <div className="p-5 md:p-10"><p className="text-[10px] uppercase tracking-editorial text-muted">Library</p><h1 className="mt-3 font-display text-6xl tracking-[-0.05em]">Media</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted">Search every uploaded image, open its project, or move unused media to trash. Uploading and ordering remain inside each project so the image context stays intact.</p><MediaLibrary initialItems={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} /></div>;
}

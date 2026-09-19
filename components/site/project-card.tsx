import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { ProjectWithMedia } from "@/lib/content";

export function ProjectCard({ project, priority = false, index = 0, horizontal = false }: { project: ProjectWithMedia; priority?: boolean; index?: number; horizontal?: boolean }) {
  const image = project.coverImage ?? project.images[0];
  if (!image) return null;
  const year = new Date(project.publishedAt ?? project.createdAt).getFullYear();
  return (
    <Link href={`/${project.slug}` as Route} className={`group block animate-fade-up [animation-delay:${Math.min(index * 90, 540)}ms]`}>
      <div className="relative overflow-hidden bg-fog" style={{ aspectRatio: horizontal ? "3 / 4" : `${image.width} / ${image.height}` }}>
        <Image
          src={image.mediumUrl}
          alt={image.alt ?? `${project.title} cover`}
          fill
          priority={priority}
          sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-ink/65 opacity-100 transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
          <div className="text-center text-[11px] font-medium uppercase tracking-editorial text-white">
            <p>{project.title}</p>
            <p className="mt-5 text-[10px] font-normal tracking-[0.12em] text-white/85">{year}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

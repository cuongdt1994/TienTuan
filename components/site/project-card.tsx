import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { ProjectWithMedia } from "@/lib/content";

export function ProjectCard({ project, priority = false, index = 0, aspectRatio }: { project: ProjectWithMedia; priority?: boolean; index?: number; aspectRatio?: string }) {
  const image = project.coverImage ?? project.images[0];
  if (!image) return null;
  return (
    <Link href={`/${project.slug}` as Route} className={`group block animate-fade-up [animation-delay:${Math.min(index * 90, 540)}ms]`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-paper" style={aspectRatio ? { aspectRatio } : undefined}>
        <Image
          src={image.originalUrl}
          alt={image.alt ?? `${project.title} cover`}
          fill
          priority={priority}
          quality={95}
          sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw"
          className="object-contain transition duration-700 ease-out group-hover:scale-[1.012]"
          style={{ objectPosition: `${project.coverPositionX}% ${project.coverPositionY}%` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-ink/70 via-ink/20 to-transparent px-5 pb-5 pt-16 opacity-100 transition-opacity duration-500 md:inset-0 md:items-center md:bg-ink/65 md:p-5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
          <div className="text-center text-[11px] font-medium uppercase tracking-editorial text-white">
            <p>{project.title}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

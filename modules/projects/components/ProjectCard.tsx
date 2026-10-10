"use client";

import Link from "next/link";
import { HiOutlineArrowSmRight as ViewIcon } from "react-icons/hi";
import { useTranslations } from "next-intl";
import { TbPinnedFilled as PinIcon } from "react-icons/tb";

import Image from "@/common/components/elements/Image";
import SpotlightCard from "@/common/components/elements/SpotlightCard";
import { ProjectItem } from "@/common/types/projects";
import { STACKS } from "@/common/constants/stacks";

const getCategoryBadge = (cat?: string) => {
  if (!cat) return null;
  const lower = cat.toLowerCase();
  if (lower === "iot") {
    return {
      label: "IoT",
      className: "bg-emerald-500/90 text-neutral-950 font-bold border-emerald-400/50",
    };
  }
  if (lower === "game") {
    return {
      label: "Game",
      className: "bg-purple-500/90 text-neutral-950 font-bold border-purple-400/50",
    };
  }
  if (lower.startsWith("web")) {
    return {
      label:
        lower === "web-frontend"
          ? "Frontend"
          : lower === "web-backend"
          ? "Backend"
          : lower === "web-fullstack"
          ? "Fullstack"
          : "Web",
      className: "bg-sky-500/90 text-neutral-950 font-bold border-sky-400/50",
    };
  }
  return {
    label: cat.toUpperCase(),
    className: "bg-neutral-700/90 text-neutral-100 font-semibold border-neutral-600",
  };
};

const ProjectCard = ({
  title,
  slug,
  description,
  image,
  stacks,
  is_featured,
  category,
}: ProjectItem) => {
  const t = useTranslations("ProjectsPage");
  const catBadge = getCategoryBadge(category);

  const safeDescription = description || "";
  const trimmedContent =
    safeDescription.slice(0, 90) + (safeDescription.length > 90 ? "..." : "");

  return (
    <Link href={`/projects/${slug}`} className="block h-full">
      <SpotlightCard className="group relative flex h-full flex-col overflow-hidden rounded-2xl cursor-pointer">
        {/* Category Badge - Top Left */}
        {catBadge && (
          <div
            className={`absolute left-3 top-3 z-10 rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wider shadow-sm border ${catBadge.className}`}
          >
            {catBadge.label}
          </div>
        )}

        {/* Featured Badge - Top Right */}
        {is_featured && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-x-1 rounded-md bg-amber-400 px-2 py-0.5 text-xs font-semibold text-neutral-900 shadow-sm">
            <PinIcon size={14} />
            <span>Featured</span>
          </div>
        )}

        {/* Fixed 16:9 Image Container with Fallback & Hover Backdrop-Blur */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          <Image
            src={image || "/images/placeholder.webp"}
            alt={title}
            width={480}
            height={270}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAwAQCdASoUAAoAPm0ukUekI6IhMAgAsBIJaQAAX+UAAAD+8fn3//+///9/8AAAAA=="
            fallbackText={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Overlay View Project */}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-sm text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span>{t("view_project")}</span>
            <ViewIcon size={20} />
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col justify-between space-y-3 p-4 sm:p-5">
          <div className="space-y-1.5">
            <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors duration-200 group-hover:text-amber-500 dark:text-neutral-100 dark:group-hover:text-amber-400">
              {title}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {trimmedContent}
            </p>
          </div>

          {/* Stacks Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(stacks || []).slice(0, 6).map((stack: string, index: number) => {
              const stackData = STACKS[stack];

              if (!stackData) {
                return (
                  <span
                    key={index}
                    className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-400"
                  >
                    {stack}
                  </span>
                );
              }

              return (
                <div key={index} className={`${stackData.color}`} title={stack}>
                  {stackData.icon}
                </div>
              );
            })}
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
};

export default ProjectCard;

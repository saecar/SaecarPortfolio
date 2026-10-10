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
      label: lower === "web-frontend" ? "Frontend" : lower === "web-backend" ? "Backend" : lower === "web-fullstack" ? "Fullstack" : "Web",
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
    safeDescription.slice(0, 85) + (safeDescription.length > 85 ? "..." : "");

  return (
    <Link href={`/projects/${slug}`}>
      <SpotlightCard className="group relative cursor-pointer">
        {catBadge && (
          <div className={`absolute left-3 top-3 z-10 rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wider shadow-sm border ${catBadge.className}`}>
            {catBadge.label}
          </div>
        )}
        {is_featured && (
          <div className="absolute right-0 top-0 z-10 flex items-center gap-x-1 rounded-bl-lg rounded-tr-lg bg-primary px-2 py-1 text-sm font-medium text-neutral-900">
            <PinIcon size={15} />
            <span>Featured</span>
          </div>
        )}
        <div className="relative">
          <Image
            src={image || "/images/placeholder.webp"}
            alt={title}
            width={450}
            height={200}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAwAQCdASoUAAoAPm0ukUekI6IhMAgAsBIJaQAAX+UAAAD+8fn3//+///9/8AAAAA=="
            className="h-[200px] w-full rounded-t-xl object-cover"
          />
          <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center gap-1 rounded-t-xl bg-black text-sm font-medium text-neutral-50 opacity-0 transition-opacity duration-300 group-hover:opacity-80">
            <span>{t("view_project")}</span>
            <ViewIcon size={20} />
          </div>
        </div>
        <div className="space-y-2 p-5">
          <h3 className="cursor-pointer text-neutral-700 transition-all duration-300 group-hover:text-primary dark:text-neutral-300">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {trimmedContent}
          </p>
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

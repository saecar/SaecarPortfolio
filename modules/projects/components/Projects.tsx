"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import ProjectSkeleton from "./ProjectSkeleton";
import ProjectCard from "./ProjectCard";

import EmptyState from "@/common/components/elements/EmptyState";
import { fetcher } from "@/services/fetcher";
import { ProjectItem } from "@/common/types/projects";

const CATEGORIES = [
  { key: "all", label: "All Projects" },
  { key: "iot", label: "IoT & Hardware" },
  { key: "game", label: "Games" },
  { key: "web", label: "Web Apps" },
];

const Projects = () => {
  const { data, isLoading, error } = useSWR("/api/projects", fetcher);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const t = useTranslations("ProjectsPage");

  const shownProjects: ProjectItem[] = (data || [])
    ?.filter((item: ProjectItem) => item?.is_show)
    .sort((a: ProjectItem, b: ProjectItem) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;

      if (a.is_featured && b.is_featured) return a.id - b.id;

      return b.id - a.id;
    });

  const filteredProjects = shownProjects.filter((item) => {
    if (selectedCategory === "all") return true;
    const cat = (item.category || "web").toLowerCase();
    if (selectedCategory === "iot") return cat === "iot";
    if (selectedCategory === "game") return cat === "game";
    if (selectedCategory === "web") return cat.startsWith("web");
    return true;
  });

  const getCategoryCount = (key: string) => {
    if (key === "all") return shownProjects.length;
    return shownProjects.filter((item) => {
      const cat = (item.category || "web").toLowerCase();
      if (key === "iot") return cat === "iot";
      if (key === "game") return cat === "game";
      if (key === "web") return cat.startsWith("web");
      return false;
    }).length;
  };

  if (error) {
    return <EmptyState message={t("error")} />;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <ProjectSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const count = getCategoryCount(cat.key);
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? "bg-neutral-800 text-neutral-100 border-neutral-700 shadow-sm dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200"
                  : "bg-neutral-100 text-neutral-600 border-neutral-200/80 hover:bg-neutral-200/60 dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-neutral-700 text-neutral-200 dark:bg-neutral-200 dark:text-neutral-800"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState message={t("no_data")} />
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.slug || project.id || index}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <ProjectCard {...project} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
};

export default Projects;

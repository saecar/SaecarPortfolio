"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { STACKS } from "@/common/constants/stacks";
import Hexagon from "./Hexagon";

const featuredStackKeys = [
  "Next.js",
  "TypeScript",
  "React.js",
  "TailwindCSS",
  "Android",
  "Kotlin",
  "Supabase",
  "Node.js",
];

const Introduction = () => {
  const t = useTranslations("HomePage");

  const paragraphData = [{ index: 1 }, { index: 2 }];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left Column: Bio & CTAs */}
        <div className="space-y-4 lg:col-span-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
              {t("intro")}
            </h1>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-1.5">
                <span>📍</span>
                <span>{t("location")}</span>
              </li>
              <li>•</li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{t("location_type")}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
            {paragraphData.map((paragraph) => (
              <p key={paragraph.index}>
                {t(`resume.paragraph_${paragraph.index}`)}
              </p>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-amber-300 active:scale-95"
            >
              View Projects →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-transparent px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Contact Me
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-4 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:gap-6">
            <div>
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">10+</span> Projects Built
            </div>
            <span>•</span>
            <div>
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">25+</span> Tech Stacks
            </div>
            <span>•</span>
            <div>
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">3+</span> Years Journey
            </div>
          </div>
        </div>

        {/* Right Column: Visual Skill Hexagons (lg screen) */}
        <div className="hidden lg:col-span-4 lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Core Technologies
            </p>
            <div className="grid grid-cols-3 gap-3">
              {featuredStackKeys.map((key, idx) => {
                const stack = STACKS[key];
                if (!stack) return null;
                return (
                  <Hexagon
                    key={key}
                    name={key}
                    indexCurrent={idx}
                    indexActive={0}
                  >
                    <div className="text-xl text-neutral-200">{stack.icon}</div>
                  </Hexagon>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Introduction;

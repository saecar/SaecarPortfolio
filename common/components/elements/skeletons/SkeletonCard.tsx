import React from "react";

export const SkeletonCard = ({ className = "" }: { className?: string }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-4 space-y-2.5">
        <div className="h-5 w-3/4 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3.5 w-full animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-800/80" />
        <div className="h-3.5 w-2/3 animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-800/80" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-14 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-6 w-14 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
};

export default SkeletonCard;

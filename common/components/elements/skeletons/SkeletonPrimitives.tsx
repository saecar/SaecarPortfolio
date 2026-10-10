import React from "react";

export const SkeletonText = ({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${
            i === lines - 1 ? "w-3/5" : "w-full"
          }`}
        />
      ))}
    </div>
  );
};

export const SkeletonImage = ({
  aspectRatio = "aspect-[16/9]",
  className = "",
}: {
  aspectRatio?: string;
  className?: string;
}) => {
  return (
    <div
      className={`w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 ${aspectRatio} ${className}`}
    />
  );
};

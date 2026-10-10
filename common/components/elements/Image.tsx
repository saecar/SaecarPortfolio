"use client";

import clsx from "clsx";
import NextImage, { ImageProps as NextImageProps } from "next/image";
import { useState } from "react";

interface ImageProps extends NextImageProps {
  rounded?: string;
  fallbackText?: string;
}

const Image = (props: ImageProps) => {
  const { alt, src, className, rounded, priority, unoptimized, fallbackText, ...rest } = props;
  const [isLoading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={clsx(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 text-neutral-500 select-none",
          rounded,
          className
        )}
      >
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <span className="text-xl font-bold opacity-60">
            {fallbackText ? fallbackText.charAt(0).toUpperCase() : "✦"}
          </span>
          <span className="text-xs font-medium opacity-50 line-clamp-1">
            {fallbackText || alt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        isLoading ? "animate-pulse bg-neutral-200 dark:bg-neutral-800" : "",
        rounded
      )}
    >
      <NextImage
        className={clsx(
          "duration-500 ease-in-out",
          isLoading
            ? "scale-[1.02] blur-md grayscale"
            : "scale-100 blur-0 grayscale-0",
          rounded,
          className
        )}
        src={src}
        alt={alt}
        loading={priority ? undefined : "lazy"}
        priority={priority}
        quality={80}
        unoptimized={unoptimized}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
        {...rest}
      />
    </div>
  );
};

export default Image;

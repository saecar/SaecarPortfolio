"use client";

import clsx from "clsx";
import NextImage, { ImageProps as NextImageProps } from "next/image";
import { useState } from "react";

interface ImageProps extends NextImageProps {
  rounded?: string;
}

const Image = (props: ImageProps) => {
  const { alt, src, className, rounded, priority, unoptimized, ...rest } = props;
  const [isLoading, setLoading] = useState(true);

  return (
    <div
      className={clsx(
        "overflow-hidden",
        isLoading ? "animate-pulse" : "",
        rounded,
      )}
    >
      <NextImage
        className={clsx(
          "duration-700 ease-in-out",
          isLoading
            ? "scale-[1.02] blur-xl grayscale"
            : "scale-100 blur-0 grayscale-0",
          rounded,
          className,
        )}
        src={src}
        alt={alt}
        loading={priority ? undefined : "lazy"}
        priority={priority}
        quality={80}
        unoptimized={unoptimized}
        onLoad={() => setLoading(false)}
        {...rest}
      />
    </div>
  );
};

export default Image;

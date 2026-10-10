import React from "react";
import clsxm from "@/common/libs/clsxm";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  weight?: "medium" | "semibold" | "bold";
}

const defaultSizes = {
  1: "3xl",
  2: "2xl",
  3: "xl",
  4: "lg",
  5: "base",
  6: "sm",
} as const;

const sizeClasses = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl sm:text-3xl",
  "3xl": "text-3xl sm:text-4xl",
};

const weightClasses = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export const Heading = ({
  level = 2,
  size,
  weight = "bold",
  className,
  children,
  ...props
}: HeadingProps) => {
  const resolvedSize = size || defaultSizes[level];
  const headingClass = clsxm(
    "tracking-tight text-neutral-900 dark:text-neutral-100",
    sizeClasses[resolvedSize],
    weightClasses[weight],
    className
  );

  switch (level) {
    case 1:
      return <h1 className={headingClass} {...props}>{children}</h1>;
    case 3:
      return <h3 className={headingClass} {...props}>{children}</h3>;
    case 4:
      return <h4 className={headingClass} {...props}>{children}</h4>;
    case 5:
      return <h5 className={headingClass} {...props}>{children}</h5>;
    case 6:
      return <h6 className={headingClass} {...props}>{children}</h6>;
    case 2:
    default:
      return <h2 className={headingClass} {...props}>{children}</h2>;
  }
};

export default Heading;

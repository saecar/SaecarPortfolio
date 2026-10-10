import React from "react";
import clsxm from "@/common/libs/clsxm";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "regular" | "medium" | "semibold" | "bold";
  variant?: "primary" | "secondary" | "muted" | "accent";
  as?: "p" | "span" | "div";
}

const sizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const weightClasses = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const variantClasses = {
  primary: "text-neutral-900 dark:text-neutral-100",
  secondary: "text-neutral-700 dark:text-neutral-300",
  muted: "text-neutral-500 dark:text-neutral-400",
  accent: "text-amber-500 dark:text-amber-400",
};

export const Text = ({
  size = "base",
  weight = "regular",
  variant = "secondary",
  as: Component = "p",
  className,
  children,
  ...props
}: TextProps) => {
  return (
    <Component
      className={clsxm(
        "leading-relaxed",
        sizeClasses[size],
        weightClasses[weight],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Text;

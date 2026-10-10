export const SPACING = {
  1: "0.25rem", // 4px
  2: "0.5rem",  // 8px
  3: "0.75rem", // 12px
  4: "1rem",    // 16px
  6: "1.5rem",  // 24px
  8: "2rem",    // 32px
  12: "3rem",   // 48px
  16: "4rem",   // 64px
} as const;

export const TYPOGRAPHY = {
  xs: ["0.75rem", { lineHeight: "1.5" }],     // 12px
  sm: ["0.875rem", { lineHeight: "1.5" }],    // 14px
  base: ["1rem", { lineHeight: "1.5" }],      // 16px
  lg: ["1.125rem", { lineHeight: "1.5" }],    // 18px
  xl: ["1.5rem", { lineHeight: "1.5" }],      // 24px
  "2xl": ["1.875rem", { lineHeight: "1.5" }], // 30px
  "3xl": ["2.25rem", { lineHeight: "1.5" }],  // 36px
} as const;

export const SEMANTIC_COLORS = {
  success: {
    DEFAULT: "#10b981",
    subtle: "rgba(16, 185, 129, 0.15)",
  },
  warning: {
    DEFAULT: "#f59e0b",
    subtle: "rgba(245, 158, 11, 0.15)",
  },
  error: {
    DEFAULT: "#ef4444",
    subtle: "rgba(239, 68, 68, 0.15)",
  },
  surface: {
    light: "#ffffff",
    dark: "#171717",
    subtleLight: "#f5f5f5",
    subtleDark: "#262626",
  },
} as const;

import { Inter } from "next/font/google";

export const inter = Inter({
  variable: "--inter-font",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "sans-serif"],
  preload: true,
});


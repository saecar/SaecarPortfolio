import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./common/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          950: "#474100",
          900: "#756c00",
          800: "#A39600",
          700: "#d1c000",
          DEFAULT: "#fbe400",
          500: "#ffee2e",
          400: "#fff15c",
          300: "#fff58a",
          200: "#fff9b8",
          100: "#fffde6",
          50: "#fffef2",
        },
        dark: {
          DEFAULT: "#121212",
        },
        light: {
          DEFAULT: "#fafafa",
        },
        neutral: {
          DEFAULT: "#d4d4d4",
        },
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
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        shine: {
          "0%": { "background-position": "100%" },
          "100%": { "background-position": "-100%" },
        },
        gradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "star-movement-bottom": {
          "0%": { transform: "translate(0%, 0%)", opacity: "1" },
          "100%": { transform: "translate(-100%, 0%)", opacity: "0" },
        },
        "star-movement-top": {
          "0%": { transform: "translate(0%, 0%)", opacity: "1" },
          "100%": { transform: "translate(100%, 0%)", opacity: "0" },
        },
      },
      animation: {
        shine: "shine 5s linear infinite",
        gradient: "gradient 8s linear infinite",
        "star-movement-bottom":
          "star-movement-bottom linear infinite alternate",
        "star-movement-top": "star-movement-top linear infinite alternate",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;

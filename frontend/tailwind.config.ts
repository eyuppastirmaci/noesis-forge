import type { Config } from "tailwindcss";
const { fontFamily } = require("tailwindcss/defaultTheme");

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
      },
      colors: {
        // Ana renkler
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        
        // Primary renkleri
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
          active: "rgb(var(--primary-active) / <alpha-value>)",
        },
        
        // Secondary renkleri
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          hover: "rgb(var(--secondary-hover) / <alpha-value>)",
          active: "rgb(var(--secondary-active) / <alpha-value>)",
        },
        
        // Accent renkleri
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          active: "rgb(var(--accent-active) / <alpha-value>)",
        },
        
        // Border ve muted
        border: "rgb(var(--border) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        
        // Durum renkleri
        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          hover: "rgb(var(--info-hover) / <alpha-value>)",
          active: "rgb(var(--info-active) / <alpha-value>)",
        },
        
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          hover: "rgb(var(--success-hover) / <alpha-value>)",
          active: "rgb(var(--success-active) / <alpha-value>)",
        },
        
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          hover: "rgb(var(--warning-hover) / <alpha-value>)",
          active: "rgb(var(--warning-active) / <alpha-value>)",
        },
        
        error: {
          DEFAULT: "rgb(var(--error) / <alpha-value>)",
          hover: "rgb(var(--error-hover) / <alpha-value>)",
          active: "rgb(var(--error-active) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
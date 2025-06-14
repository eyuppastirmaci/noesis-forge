"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const SunIcon = () => <span>☀️</span>;
const MoonIcon = () => <span>🌙</span>;

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className="p-2 rounded-md bg-gray-200 dark:bg-gray-800" 
        style={{ width: "40px", height: "40px" }}
        aria-label="Loading theme switcher"
      />
    );
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const currentTheme = resolvedTheme || theme;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {currentTheme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

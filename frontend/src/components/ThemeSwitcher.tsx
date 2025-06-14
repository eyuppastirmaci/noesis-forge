"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Select, SelectOption } from "./ui/Select";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className="w-40 h-10 rounded-md bg-secondary animate-pulse" 
        aria-label="Loading theme switcher"
      />
    );
  }

  const currentTheme = theme || "system";

  const themeOptions: SelectOption[] = [
    {
      value: "system",
      label: "System",
      icon: <Monitor className="w-4 h-4" />
    },
    {
      value: "light",
      label: "Light",
      icon: <Sun className="w-4 h-4" />
    },
    {
      value: "dark",
      label: "Dark",
      icon: <Moon className="w-4 h-4" />
    }
  ];

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
  };

  return (
    <Select
      options={themeOptions}
      value={currentTheme}
      onChange={handleThemeChange}
      placeholder="Select theme"
      className="w-40"
      aria-label="Select theme"
    />
  );
}

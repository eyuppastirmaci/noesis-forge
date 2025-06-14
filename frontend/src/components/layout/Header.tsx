"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "../ThemeSwitcher";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full flex justify-between items-center px-4 h-[80px]">
        <div className="flex items-center gap-2">
          <div className="w-[280px] h-[280px] bg-secondary animate-pulse rounded" />
        </div>
        <ThemeSwitcher />
      </div>
    );
  }

  const getLogoSrc = () => {
    const currentTheme = resolvedTheme || theme;
    if (currentTheme === 'dark') {
      return "/assets/images/logo/logo-dark.svg";
    }
    return "/assets/images/logo/logo-light.svg";
  };

  return (
    <div className="w-full flex justify-between items-center px-4 h-[80px]">
      <div className="flex items-center gap-2">
        <Image 
          src={getLogoSrc()} 
          alt="Noesis Forge" 
          width={280} 
          height={280} 
          className="object-contain" 
        />
      </div>
      <ThemeSwitcher />
    </div>
  );
}

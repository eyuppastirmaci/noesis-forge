"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import BreadCrumb from "../BreadCrumb";

export default function HeaderLeft() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-[280px] h-[280px] bg-background-secondary animate-pulse rounded" />
      </div>
    );
  }

  const getLogoSrc = () => {
    const currentTheme = resolvedTheme || theme;
    if (currentTheme === "dark") {
      return "/assets/images/logo/logo-dark.svg";
    }
    return "/assets/images/logo/logo-light.svg";
  };

  return (
    <div className="flex items-center gap-2">
      <Link href="/">
        <Image
          src={getLogoSrc()}
          alt="Noesis Forge"
          width={220}
          height={220}
          className={`object-contain opacity-90 hover:opacity-100 `}
        />
      </Link>
      <BreadCrumb />
    </div>
  );
}

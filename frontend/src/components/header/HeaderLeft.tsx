"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Menu } from "lucide-react";
import { RootState } from "@/store";
import { toggleSidebar } from "@/store/slices/sidebarSlice";
import BreadCrumb from "../BreadCrumb";

export default function HeaderLeft() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state: RootState) => state.sidebar.isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="w-8 h-8 bg-background-secondary animate-pulse rounded sm:hidden" />
        <div className="w-[180px] sm:w-[220px] h-[40px] sm:h-[60px] bg-background-secondary animate-pulse rounded" />
      </div>
    );
  }

  const getLogoSrc = () => {
    const currentTheme = resolvedTheme || theme;
    if (currentTheme === "dark") {
      return "/assets/images/logo/header-logo-dark.png";
    }
    return "/assets/images/logo/header-logo-light.png";
  };

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {/* Hamburger Menu Button (Mobile Only) */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="hamburger-button p-1.5 sm:p-2 rounded-lg hover:bg-background-secondary transition-colors sm:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      <Link href="/" className="flex-shrink-0">
        <Image
          src={getLogoSrc()}
          alt="Noesis Forge"
          width={220}
          height={0}
          className={`object-contain opacity-90 hover:opacity-100 w-[180px] sm:w-[220px] h-auto`}
          priority
        />
      </Link>
      
      {/* Hide breadcrumb on mobile */}
      <div className="hidden lg:block">
        <BreadCrumb />
      </div>
    </div>
  );
}

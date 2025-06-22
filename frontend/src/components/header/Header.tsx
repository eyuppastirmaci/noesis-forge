"use client";

import { useEffect, useState } from "react";
import HeaderLeft from "./HeaderLeft";
import HeaderCenter from "./HeaderCenter";
import HeaderRight from "./HeaderRight";

export default function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 items-center px-2 sm:px-4 h-auto sm:h-[80px] py-2 sm:py-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-8 h-8 bg-background-secondary animate-pulse rounded sm:hidden" />
          <div className="w-[180px] sm:w-[220px] h-[40px] sm:h-[60px] bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="hidden sm:flex justify-center">
          <div className="w-48 h-10 bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
          <div className="w-8 h-8 bg-background-secondary animate-pulse rounded-full" />
          <div className="w-16 h-4 bg-background-secondary animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-2 py-2 h-[60px]">
          <HeaderLeft />
          <HeaderRight />
        </div>
        <div className="px-2 pb-2">
          <HeaderCenter />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-3 items-center px-4 h-[80px]">
        <HeaderLeft />
        <HeaderCenter />
        <HeaderRight />
      </div>
    </div>
  );
}
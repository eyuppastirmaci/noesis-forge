"use client";

import { useEffect, useState } from "react";
import HeaderLeft from "../header/HeaderLeft";
import HeaderCenter from "../header/HeaderCenter";
import HeaderRight from "../header/HeaderRight";

export default function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full grid grid-cols-3 items-center px-4 h-[80px]">
        <div className="flex items-center gap-2">
          <div className="w-[220px] h-[60px] bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="flex justify-center">
          <div className="w-48 h-10 bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="w-8 h-8 bg-background-secondary animate-pulse rounded-full" />
          <div className="w-16 h-4 bg-background-secondary animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-3 items-center px-4 h-[80px]">
      {/* Left Section */}
      <HeaderLeft />

      {/* Center Section */}
      <HeaderCenter />

      {/* Right Section */}
      <HeaderRight />
    </div>
  );
}
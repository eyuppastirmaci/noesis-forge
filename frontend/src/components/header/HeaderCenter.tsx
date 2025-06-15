"use client";

import { useState, useEffect } from "react";
import GlobalSearch from "../GlobalSearch";

export default function HeaderCenter() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <div className="w-48 h-10 bg-background-secondary animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <GlobalSearch />
    </div>
  );
}

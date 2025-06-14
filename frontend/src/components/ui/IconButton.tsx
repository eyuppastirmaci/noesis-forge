"use client";

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

export default function IconButton({
  Icon,
  onClick,
  className,
}: {
  Icon: LucideIcon;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group cursor-pointer w-9 h-9 rounded-full flex items-center justify-center",
        "bg-[var(--background)]",
        "border border-[var(--icon-button-border)]",
        "hover:border-[var(--icon-button-border-hover)]",
        "active:border-[var(--icon-button-border-active)]",
        className
      )}
    >
      <Icon
        className={cn(
          "w-4.5 h-4.5",
          "text-[var(--icon-button-icon)]",
          "group-hover:text-[var(--icon-button-icon-hover)]",
          "group-active:text-[var(--icon-button-icon-active)]"
        )}
      />
    </button>
  );
}

"use client";

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

export default function IconLinkButton({
  Icon,
  href,
  className,
}: {
  Icon: LucideIcon;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("icon-button", className)}>
      <Icon className="icon-button-icon" />
    </Link>
  );
}

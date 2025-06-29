"use client";

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

type IconButtonVariant =
  | "default"
  | "primary"
  | "danger"
  | "success"
  | "warning";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
  Icon: LucideIcon;
  onClick: () => void;
  className?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  bordered?: boolean;
  disabled?: boolean;
  filled?: boolean;
}

const variantStyles = {
  default: {
    base: "text-foreground-secondary hover:text-foreground",
    hover: "hover:bg-gray-50 dark:hover:bg-gray-800/50",
  },
  primary: {
    base: "text-blue-600 hover:text-blue-700",
    hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
  },
  danger: {
    base: "text-red-600 hover:text-red-700",
    hover: "hover:bg-red-50 dark:hover:bg-red-900/20",
  },
  success: {
    base: "text-green-600 hover:text-green-700",
    hover: "hover:bg-green-50 dark:hover:bg-green-900/20",
  },
  warning: {
    base: "text-orange-600 hover:text-orange-700",
    hover: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
  },
};

const sizeStyles = {
  sm: {
    container: "w-6 h-6",
    icon: "w-4 h-4",
  },
  md: {
    container: "w-8 h-8",
    icon: "w-5 h-5",
  },
  lg: {
    container: "w-10 h-10",
    icon: "w-6 h-6",
  },
};

export default function IconButton({
  Icon,
  onClick,
  className,
  variant = "default",
  size = "md",
  bordered = true,
  disabled = false,
  filled = false,
}: IconButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const baseClasses = cn(
    "inline-flex items-center justify-center cursor-pointer transition-all duration-200",
    sizeStyle.container,
    bordered
      ? "rounded-full border bg-background border-icon-button-border hover:border-icon-button-border-hover active:border-icon-button-border-active"
      : "rounded bg-transparent border-none",
    variantStyle.base,
    !bordered ? variantStyle.hover : "",
    disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
    className
  );

  const iconClasses = cn(
    "flex-shrink-0 transition-all duration-200",
    sizeStyle.icon
  );

  return (
    <button onClick={onClick} className={baseClasses} disabled={disabled}>
      <Icon className={iconClasses} fill={filled ? "currentColor" : "none"} />
    </button>
  );
}

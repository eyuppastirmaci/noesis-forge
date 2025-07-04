"use client";

import React from "react";
import Switch from "react-switch";
import { cn } from "@/lib/cn";

interface SwitchButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  disabled?: boolean;
  onColor?: string;
  offColor?: string;
  className?: string;
}

const SwitchButton: React.FC<SwitchButtonProps> = ({
  checked,
  onChange,
  title,
  disabled = false,
  onColor = "#3b82f6",
  offColor = "#6b7280",
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {title && (
        <span className="text-sm text-foreground-secondary select-none">
          {title}
        </span>
      )}
      <Switch
        onChange={onChange}
        checked={checked}
        height={20}
        width={40}
        handleDiameter={16}
        uncheckedIcon={false}
        checkedIcon={false}
        onColor={onColor}
        offColor={offColor}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
};

export default SwitchButton; 
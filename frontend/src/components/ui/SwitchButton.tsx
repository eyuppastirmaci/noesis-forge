"use client";

import React from "react";
import Switch from "react-switch";

interface SwitchButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  disabled?: boolean;
  onColor?: string;
  offColor?: string;
}

const SwitchButton: React.FC<SwitchButtonProps> = ({
  checked,
  onChange,
  title,
  disabled = false,
  onColor = "#3b82f6",
  offColor = "#6b7280", 
}) => {
  return (
    <div className="flex items-center gap-3">
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
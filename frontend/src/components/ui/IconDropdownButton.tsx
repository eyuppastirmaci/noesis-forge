"use client";

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export default function IconDropdownButton({
  Icon,
  dropdownItems,
  className,
}: {
  Icon: LucideIcon;
  dropdownItems: DropdownItem[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: DropdownItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleButtonClick} className={cn("icon-button", className)}>
        <Icon className="icon-button-icon" />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full mt-1 right-0 min-w-48 z-50",
          "bg-background border border-icon-button-border",
          "rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95"
        )}>
          {dropdownItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              className={cn(
                "w-full px-3 py-2 text-left flex items-center gap-2",
                "text-foreground text-sm",
                "hover:bg-background-secondary",
                "hover:text-foreground",
                "transition-colors duration-150"
              )}
            >
              {item.icon && (
                <item.icon className="w-4 h-4 text-foreground-secondary" />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
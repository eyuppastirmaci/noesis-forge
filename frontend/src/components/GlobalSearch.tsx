"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Command } from "lucide-react";

export default function GlobalSearch() {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to blur
      if (e.key === "Escape") {
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const isActive = isFocused || searchValue.length > 0;

  return (
    <div
      className={`relative transition-all duration-300 ease-out ${
        isActive ? "w-[480px]" : "w-96"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`
          relative flex items-center gap-3 px-5 h-12 
          bg-[var(--background)] 
          border rounded-full
          transition-all duration-200
          ${
            isFocused
              ? "border-[var(--icon-button-border-active)] shadow-lg shadow-black/5 dark:shadow-white/5"
              : isHovered
              ? "border-[var(--icon-button-border-hover)]"
              : "border-[var(--border)]"
          }
        `}
      >
        {/* Search Icon */}
        <Search
          className={`
            w-5 h-5 flex-shrink-0
            transition-colors duration-200
            ${
              isFocused
                ? "text-[var(--icon-button-icon-active)]"
                : isHovered
                ? "text-[var(--icon-button-icon-hover)]"
                : "text-[var(--icon-button-icon)]"
            }
          `}
        />

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search Documents, Papers, Docs..."
          className={`
            flex-1 bg-transparent border-none outline-none
            text-base font-normal
            text-[var(--foreground)]
            placeholder:text-[var(--foreground-secondary)]
            ${isFocused ? "placeholder:opacity-70" : "placeholder:opacity-50"}
          `}
        />

        {/* Keyboard Shortcut Indicator */}
        {!isActive && (
          <div
            className={`
              flex items-center gap-1 
              transition-opacity duration-200
              ${isHovered ? "opacity-0" : "opacity-100"}
            `}
          >
            <kbd
              className={`
                inline-flex items-center justify-center
                h-6 min-w-[24px] px-1.5
                text-[11px] font-medium
                bg-[var(--background-secondary)]
                border border-[var(--border)]
                rounded
                text-[var(--foreground-secondary)]
              `}
            >
              <Command className="w-3 h-3" />
            </kbd>
            <kbd
              className={`
                inline-flex items-center justify-center
                h-6 min-w-[24px] px-1.5
                text-[11px] font-medium
                bg-[var(--background-secondary)]
                border border-[var(--border)]
                rounded
                text-[var(--foreground-secondary)]
              `}
            >
              K
            </kbd>
          </div>
        )}

        {/* Clear Button - Shows when there's text */}
        {searchValue && (
          <button
            onClick={() => setSearchValue("")}
            className={`
              flex items-center justify-center
              w-6 h-6 rounded-full
              bg-[var(--background-secondary)]
              hover:bg-[var(--border)]
              transition-all duration-200
              animate-in fade-in-0 zoom-in-95
            `}
          >
            <span className="text-sm text-[var(--foreground-secondary)]">
              ×
            </span>
          </button>
        )}
      </div>

      {/* Glow Effect on Focus */}
      {isFocused && (
        <div
          className={`
            absolute inset-0 -z-10
            bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20
            blur-xl opacity-50
            rounded-full
            animate-pulse
          `}
        />
      )}
    </div>
  );
}

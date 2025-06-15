"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement[]>([]);

  const selectedOption = options.find(option => option.value === value);

  const updateDropdownPosition = () => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both select trigger and dropdown
      if (
        selectRef.current && 
        !selectRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
        } else {
          setIsOpen(true);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setFocusedIndex(-1);
    }
  };

  const DropdownContent = () => (
    <div
      ref={dropdownRef}
      role="listbox"
      style={{
        position: "absolute",
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999,
      }}
      className="bg-background-secondary border border-border rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95"
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          ref={el => {
            if (el) optionsRef.current[index] = el;
          }}
          role="option"
          aria-selected={option.value === value}
          onClick={(event) => handleOptionClick(option.value, event)}
          onMouseEnter={() => setFocusedIndex(index)}
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer text-foreground text-sm
            transition-colors duration-150
            ${option.value === value ? "bg-accent-soft font-medium" : "font-normal"}
            ${focusedIndex === index ? "bg-accent-soft" : ""}
            ${index === 0 ? "rounded-t-md" : ""}
            ${index === options.length - 1 ? "rounded-b-md" : ""}
            hover:bg-accent-soft
          `}
        >
          {option.icon && (
            <span className={option.value === value ? "text-foreground" : "text-foreground-secondary"}>
              {option.icon}
            </span>
          )}
          <span>{option.label}</span>
          {option.value === value && (
            <div className="ml-auto">
              <div className="w-2 h-2 bg-foreground rounded-full"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div 
        ref={selectRef}
        className={`relative ${className}`}
      >
        {/* Select Trigger */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          tabIndex={disabled ? -1 : 0}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`
            flex items-center justify-between w-full h-10 px-3
            bg-background-secondary border border-border rounded-md
            text-foreground text-sm cursor-pointer
            transition-all duration-150
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent-soft hover:border-border-hover"}
            ${isOpen ? "outline outline-2 outline-foreground outline-offset-2" : ""}
          `}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && (
              <span className="text-foreground-secondary">
                {selectedOption.icon}
              </span>
            )}
            <span className={selectedOption ? "text-foreground" : "text-foreground-secondary"}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          
          <ChevronDown 
            className={`w-4 h-4 text-foreground-secondary transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>
      </div>

      {/* Portal Dropdown */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <DropdownContent />,
        document.body
      )}
    </>
  );
}
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
    
    console.log("Option clicked:", optionValue); // Debug log
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
        backgroundColor: "var(--background-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "0.375rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        maxHeight: "15rem",
        overflowY: "auto"
      }}
      className="animate-in fade-in-0 zoom-in-95 "
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
            color: "var(--foreground)",
            fontSize: "0.875rem",
            backgroundColor: option.value === value 
              ? "var(--accent-soft)" 
              : focusedIndex === index 
                ? "var(--accent-soft)" 
                : "transparent",
            fontWeight: option.value === value ? "500" : "400",
            borderTopLeftRadius: index === 0 ? "0.375rem" : "0",
            borderTopRightRadius: index === 0 ? "0.375rem" : "0",
            borderBottomLeftRadius: index === options.length - 1 ? "0.375rem" : "0",
            borderBottomRightRadius: index === options.length - 1 ? "0.375rem" : "0"
          }}
          onMouseOver={(e) => {
            if (option.value !== value && focusedIndex !== index) {
              e.currentTarget.style.backgroundColor = "var(--accent-soft)";
            }
          }}
          onMouseOut={(e) => {
            if (option.value !== value && focusedIndex !== index) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {option.icon && (
            <span style={{ 
              color: option.value === value ? "var(--foreground)" : "var(--foreground-secondary)" 
            }}>
              {option.icon}
            </span>
          )}
          <span>{option.label}</span>
          {option.value === value && (
            <div style={{ marginLeft: "auto" }}>
              <div style={{ 
                width: "0.5rem", 
                height: "0.5rem", 
                backgroundColor: "var(--foreground)", 
                borderRadius: "50%" 
              }}></div>
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "2.5rem",
            padding: "0 0.75rem",
            backgroundColor: "var(--background-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "0.375rem",
            color: "var(--foreground)",
            fontSize: "0.875rem",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            outline: isOpen ? "2px solid var(--foreground)" : "none",
            outlineOffset: isOpen ? "2px" : "0"
          }}
          onMouseOver={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = "var(--accent-soft)";
              e.currentTarget.style.borderColor = "var(--border-hover)";
            }
          }}
          onMouseOut={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = "var(--background-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.outline = "2px solid var(--foreground)";
              e.currentTarget.style.outlineOffset = "2px";
            }
          }}
          onBlur={(e) => {
            if (!isOpen) {
              e.currentTarget.style.outline = "none";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selectedOption?.icon && (
              <span style={{ color: "var(--foreground-secondary)" }}>
                {selectedOption.icon}
              </span>
            )}
            <span style={{ 
              color: selectedOption ? "var(--foreground)" : "var(--foreground-secondary)" 
            }}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          
          <ChevronDown 
            style={{
              width: "1rem",
              height: "1rem",
              color: "var(--foreground-secondary)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}
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
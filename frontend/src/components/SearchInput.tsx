"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SearchInput = memo(({ 
  value, 
  onChange, 
  onClear,
  placeholder = "Search...",
  className = "",
  disabled = false
}: SearchInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onClear();
  }, [onClear]);

  return (
    <div className={`lg:flex-1 lg:max-w-md relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleInputChange}
        disabled={disabled}
        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-background border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {localValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput; 
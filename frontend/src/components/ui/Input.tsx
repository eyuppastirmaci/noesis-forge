"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: "default" | "filled";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      variant = "default",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const reactId = useId();
    const inputId = id || reactId;

    const baseClasses = "px-4 py-2 border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
      default: "bg-background border-border focus:ring-2 focus:ring-blue/30 focus:border-blue hover:border-border-hover",
      filled: "bg-background-secondary border-border focus:ring-2 focus:ring-blue/30 focus:border-blue hover:border-border-hover"
    };

    const errorClasses = error 
      ? "border-red focus:border-red focus:ring-red/20" 
      : "";

    const widthClass = fullWidth ? "w-full" : "";
    const paddingClasses = leftIcon && rightIcon 
      ? "pl-10 pr-10" 
      : leftIcon 
        ? "pl-10 pr-4" 
        : rightIcon 
          ? "pl-4 pr-10" 
          : "px-4";

    const inputClasses = `${baseClasses} ${variantClasses[variant]} ${errorClasses} ${widthClass} ${paddingClasses} ${className}`.trim();

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium mb-2 text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-sm text-red">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-foreground-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
"use client";

import React, { forwardRef, useId } from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { cn } from "@/lib/cn";

interface NumberInputProps
  extends Omit<NumericFormatProps, "onValueChange" | "value" | "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: "default" | "filled";
  value?: number | "";
  onChange?: (value: number | undefined) => void;
  className?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      variant = "default",
      value,
      onChange,
      className,
      id,
      ...rest
    },
    ref
  ) => {
    const reactId = useId();
    const inputId = id || reactId;

    const baseClasses =
      "px-4 py-2 border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses: Record<string, string> = {
      default:
        "bg-background border-border focus:ring-2 focus:ring-blue/30 focus:border-blue hover:border-border-hover",
      filled:
        "bg-background-secondary border-border focus:ring-2 focus:ring-blue/30 focus:border-blue hover:border-border-hover",
    };

    const errorClasses = error
      ? "border-red focus:border-red focus:ring-red/20"
      : "";

    const widthClass = fullWidth ? "w-full" : "";

    const inputClasses = cn(
      baseClasses,
      variantClasses[variant],
      errorClasses,
      widthClass,
      className
    );

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

        <NumericFormat
          getInputRef={ref}
          id={inputId}
          className={inputClasses}
          value={value === "" ? "" : value}
          allowNegative={false}
          decimalScale={0}
          allowLeadingZeros={false}
          thousandSeparator={false}
          onValueChange={(vals) => {
            if (onChange) {
              onChange(vals.floatValue);
            }
          }}
          {...rest}
        />

        {error && <p className="mt-1 text-sm text-red">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-foreground-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;

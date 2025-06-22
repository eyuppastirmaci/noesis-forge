import React from "react";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "rectangle";
  width?: string;
  height?: string;
  lines?: number; // For text variant with multiple lines
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangle",
  width,
  height,
  lines = 1,
}) => {
  // Base shimmer animation classes
  const shimmerClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer";

  // Variant-specific classes
  const variantClasses = {
    text: "h-4 rounded",
    card: "rounded-lg",
    circle: "rounded-full",
    rectangle: "rounded",
  };

  // If text variant with multiple lines
  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              shimmerClasses,
              "h-4 rounded",
              index === lines - 1 ? "w-3/4" : "w-full" // Make last line shorter
            )}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(shimmerClasses, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
};

// Document Card Skeleton for grid view
export const DocumentCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-lg shadow-sm min-h-[180px] flex flex-col bg-background-secondary border border-border p-4">
      {/* Header with icon and actions */}
      <div className="flex items-start justify-between mb-3">
        <Skeleton variant="circle" className="w-8 h-8" />
        <div className="flex space-x-1">
          <Skeleton variant="circle" className="w-6 h-6" />
          <Skeleton variant="circle" className="w-6 h-6" />
        </div>
      </div>

      {/* Document title */}
      <div className="mb-2 flex-grow">
        <Skeleton variant="text" lines={2} className="mb-1" />
      </div>

      {/* Document metadata */}
      <div className="space-y-1.5 mt-auto">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" className="w-16 h-3" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>

        <div className="flex items-center justify-between">
          <Skeleton variant="rectangle" className="w-16 h-5 rounded-full" />
          <div className="flex space-x-3">
            <div className="flex items-center space-x-1">
              <Skeleton variant="circle" className="w-3 h-3" />
              <Skeleton variant="text" className="w-4 h-3" />
            </div>
            <div className="flex items-center space-x-1">
              <Skeleton variant="circle" className="w-3 h-3" />
              <Skeleton variant="text" className="w-4 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Text Skeleton for results header
export const TextSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <Skeleton variant="text" className={cn("w-32 h-4", className)} />;
};

export default Skeleton; 
"use client";

export default function LoadingSpinner({
  size = "md",
  variant = "default",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "default" | "primary" | "secondary";
  className?: string;
}) {
  const sizeClasses: Record<"xs" | "sm" | "md" | "lg" | "xl" | "2xl", string> =
    {
      xs: "w-3 h-3 border-2",
      sm: "w-4 h-4 border-2",
      md: "w-6 h-6 border-2",
      lg: "w-8 h-8 border-3",
      xl: "w-12 h-12 border-4",
      "2xl": "w-16 h-16 border-4",
    };

  const variantClasses: Record<"default" | "primary" | "secondary", string> = {
    default:
      "border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300",
    primary:
      "border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400",
    secondary:
      "border-gray-200 border-t-gray-500 dark:border-gray-700 dark:border-t-gray-400",
  };

  return (
    <div className="inline-flex items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className={`
          ${sizeClasses[size]} 
          ${variantClasses[variant]}
          animate-spin rounded-full
          ${className}
        `}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

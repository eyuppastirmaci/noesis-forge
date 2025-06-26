import { useEffect } from "react";

export interface UseEscapeKeyOptions {
  isActive?: boolean;
  onEscape: () => void;
  preventDefault?: boolean;
}

export const useEscapeKey = ({ 
  isActive = true, 
  onEscape,
  preventDefault = true 
}: UseEscapeKeyOptions) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        onEscape();
      }
    };

    // Use capture phase to handle escape before other handlers
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isActive, onEscape, preventDefault]);
};
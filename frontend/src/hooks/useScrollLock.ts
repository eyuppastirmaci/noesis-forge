import { useEffect, useRef } from "react";

export interface UseScrollLockOptions {
  isLocked: boolean;
  preservePosition?: boolean;
}

export const useScrollLock = ({ 
  isLocked, 
  preservePosition = true 
}: UseScrollLockOptions) => {
  const scrollPosition = useRef(0);

  useEffect(() => {
    if (!isLocked) return;

    // Store current scroll position
    if (preservePosition) {
      scrollPosition.current = window.scrollY;
    }

    // Get current scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Store original styles
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Apply styles to prevent scroll
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore scroll position
      if (preservePosition && scrollPosition.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition.current);
        });
      }
    };
  }, [isLocked, preservePosition]);
};
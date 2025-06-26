import { RefObject, useEffect } from "react";

export interface UseClickOutsideOptions<T extends HTMLElement = HTMLElement> {
  ref: RefObject<T | null>;
  isActive?: boolean;
  onClickOutside: (event: MouseEvent) => void;
}

export const useClickOutside = <T extends HTMLElement = HTMLElement>({ 
  ref, 
  isActive = true, 
  onClickOutside 
}: UseClickOutsideOptions<T>) => {
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside(event);
      }
    };

    // Use mousedown instead of click for better UX
    // This prevents clicking and dragging from inside to outside triggering the handler
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [ref, isActive, onClickOutside]);
};
/**
 * Debounce function for search inputs and other scenarios
 * Creates a debounced version of a function that delays execution until after wait milliseconds
 * have elapsed since its last invocation
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns Debounced function that delays execution
 * @example
 * const debouncedSearch = debounce(searchFunction, 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit function calls
 * Creates a throttled version of a function that only invokes at most once per limit milliseconds
 * @param func - The function to throttle
 * @param limit - The number of milliseconds to throttle invocations to
 * @returns Throttled function that limits call frequency
 * @example
 * const throttledScroll = throttle(scrollHandler, 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Delay function that returns a promise
 * Creates a promise that resolves after the specified number of milliseconds
 * @param ms - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 * @example
 * await delay(1000); // Wait for 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 
// Default formatters using Intl.DateTimeFormat
const defaultDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short", 
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

/**
 * Format a date string or Date object using the default format
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  return defaultDateFormatter.format(dateObj);
};

/**
 * Format a date using a long format with weekday
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string (e.g., "Monday, January 15, 2024")
 */
export const formatLongDate = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  return longDateFormatter.format(dateObj);
};

/**
 * Format a date using a short format
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string (e.g., "Jan 15")
 */
export const formatShortDate = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  return shortDateFormatter.format(dateObj);
};

/**
 * Format time only
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted time string (e.g., "02:30 PM")
 */
export const formatTime = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Time";
  }
  
  return timeFormatter.format(dateObj);
};

/**
 * Format date and time together
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date and time string (e.g., "Jan 15, 2024, 02:30 PM")
 */
export const formatDateTime = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid DateTime";
  }
  
  return dateTimeFormatter.format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date string, Date object, or timestamp
 * @param options - Options for formatting (addSuffix)
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: string | Date | number,
  options: { addSuffix?: boolean } = { addSuffix: true }
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const isPast = diffMs < 0;
  const addSuffix = options.addSuffix !== false;
  
  let value: number;
  let unit: string;
  
  if (diffYears >= 1) {
    value = diffYears;
    unit = diffYears === 1 ? "year" : "years";
  } else if (diffMonths >= 1) {
    value = diffMonths;
    unit = diffMonths === 1 ? "month" : "months";
  } else if (diffWeeks >= 1) {
    value = diffWeeks;
    unit = diffWeeks === 1 ? "week" : "weeks";
  } else if (diffDays >= 1) {
    value = diffDays;
    unit = diffDays === 1 ? "day" : "days";
  } else if (diffHours >= 1) {
    value = diffHours;
    unit = diffHours === 1 ? "hour" : "hours";
  } else if (diffMinutes >= 1) {
    value = diffMinutes;
    unit = diffMinutes === 1 ? "minute" : "minutes";
  } else {
    value = diffSeconds;
    unit = diffSeconds === 1 ? "second" : "seconds";
  }
  
  if (!addSuffix) {
    return `${value} ${unit}`;
  }
  
  if (isPast) {
    return `${value} ${unit} ago`;
  } else {
    return `in ${value} ${unit}`;
  }
};

/**
 * Alias for formatRelativeTime to match date-fns API
 * @param date - Date string, Date object, or timestamp
 * @param options - Options for formatting
 * @returns Relative time string
 */
export const formatDistanceToNow = formatRelativeTime;

/**
 * Check if a date is today
 * @param date - Date string, Date object, or timestamp
 * @returns Boolean indicating if the date is today
 */
export const isToday = (date: string | Date | number): boolean => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return false;
  }
  
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if a date is yesterday
 * @param date - Date string, Date object, or timestamp
 * @returns Boolean indicating if the date is yesterday
 */
export const isYesterday = (date: string | Date | number): boolean => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return false;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateObj.toDateString() === yesterday.toDateString();
};

/**
 * Smart date formatter that shows relative time for recent dates, absolute for older ones
 * @param date - Date string, Date object, or timestamp
 * @returns Smart formatted date string
 */
export const formatSmartDate = (date: string | Date | number): string => {
  const dateObj = typeof date === "string" ? new Date(date) : 
                  typeof date === "number" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  if (isToday(dateObj)) {
    return `Today, ${formatTime(dateObj)}`;
  } else if (isYesterday(dateObj)) {
    return `Yesterday, ${formatTime(dateObj)}`;
  } else {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return formatRelativeTime(dateObj);
    } else {
      return formatDate(dateObj);
    }
  }
};

/**
 * Create a custom formatter with specific options
 * @param options - Intl.DateTimeFormatOptions
 * @param locale - Locale string (default: "en-US")
 * @returns Custom formatter function
 */
export const createCustomDateFormatter = (
  options: Intl.DateTimeFormatOptions,
  locale: string = "en-US"
) => {
  const formatter = new Intl.DateTimeFormat(locale, options);
  
  return (date: string | Date | number): string => {
    const dateObj = typeof date === "string" ? new Date(date) : 
                    typeof date === "number" ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    
    return formatter.format(dateObj);
  };
}; 
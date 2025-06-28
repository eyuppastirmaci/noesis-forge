// Determine API URL based on environment
const getApiUrl = (): string => {
  // Server-side rendering in Docker - only use INTERNAL_API_URL if running in Docker
  if (typeof window === "undefined" && process.env.INTERNAL_API_URL && process.env.NODE_ENV === "production") {
    return process.env.INTERNAL_API_URL;
  }
  
  // Client-side or development
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
};

export const ENV = {
  API_URL: getApiUrl(),
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
} as const;

export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
} as const;

export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  MINIO_PUBLIC_URL: process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL || "http://localhost:9000/noesis-documents",
  BACKEND_PORT: process.env.BACKEND_PORT || "8000"
} as const;

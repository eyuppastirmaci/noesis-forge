import { ENV } from "./env";

export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  TIMEOUT: 10000,
  HEADERS: {
    "Content-Type": "application/json",
  },
} as const;

import { useSession } from "next-auth/react";
import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";

export function useAuthAPI(): AxiosInstance {
  const { data: session } = useSession();

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          window.location.href = "/auth/login";
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [session?.accessToken]);

  return axiosInstance;
}

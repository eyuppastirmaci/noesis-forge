"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, type ThemeProviderProps } from "next-themes";
import { useState } from "react";
import AuthSessionProvider from "./SessionProvider";
import ToastProvider from "./ToastProvider";

export function Providers({ children, ...props }: ThemeProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes cache time
            staleTime: 1000 * 60 * 5,
            // Automatic retry on network errors
            retry: 1,
            // Automatic refetch in the background
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Do not retry on mutation errors
            retry: false,
          },
        },
      })
  );

  return (
    <ToastProvider>
      <AuthSessionProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider {...props} storageKey="noesis-theme">
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </AuthSessionProvider>
    </ToastProvider>
  );
}
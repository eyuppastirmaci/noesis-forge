"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";
import AuthSessionProvider from "./SessionProvider";
import ToastProvider from "./ToastProvider";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <ToastProvider>
      <AuthSessionProvider>
        <ThemeProvider {...props} storageKey="noesis-theme">
          {children}
        </ThemeProvider>
      </AuthSessionProvider>
    </ToastProvider>
  );
}

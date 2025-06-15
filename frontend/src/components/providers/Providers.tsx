"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";
import AuthSessionProvider from "./SessionProvider";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <AuthSessionProvider>
      <ThemeProvider {...props} storageKey="noesis-theme">
        {children}
      </ThemeProvider>
    </AuthSessionProvider>
  );
}

"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";

export function Providers({ children, ...props }: ThemeProviderProps) {
    return (
        <ThemeProvider 
            {...props} 
            disableTransitionOnChange={false}
            storageKey="noesis-theme"
        >
            {children}
        </ThemeProvider>
    );
}
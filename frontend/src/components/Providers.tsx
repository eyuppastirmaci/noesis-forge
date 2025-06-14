"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";

export function Providers({ children, ...props }: ThemeProviderProps) {
    return (
        <ThemeProvider 
            {...props} 
            storageKey="noesis-theme"
        >
            {children}
        </ThemeProvider>
    );
}
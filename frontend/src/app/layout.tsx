import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "@/components/Providers";
import Header from "@/components/layout/Header";
import { inter } from "@/lib/fonts";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Noesis Forge",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers attribute="class" defaultTheme="system" enableSystem>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

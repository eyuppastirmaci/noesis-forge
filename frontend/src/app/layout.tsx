import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { inter } from "@/lib/fonts";
import MainLayout from "@/components/layout/MainLayout";

// Disable the cache for now.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: '%s | Noesis Forge',
    default: 'Noesis Forge'
  },
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers attribute="class" defaultTheme="system" enableSystem>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}

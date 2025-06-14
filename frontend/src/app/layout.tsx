import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Header from "@/components/layout/Header";

export const dynamic = 'force-dynamic';

const inter = localFont({
  src: [
    {
      path: "./fonts/Inter-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/Inter-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/Inter-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Inter-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Inter-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Inter-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Inter-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Inter-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/Inter-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-inter",
});

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

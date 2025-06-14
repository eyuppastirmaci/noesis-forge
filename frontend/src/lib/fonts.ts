import localFont from "next/font/local";

export const inter = localFont({
  src: [
    {
      path: "../app/fonts/Inter-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../app/fonts/Inter-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-inter",
});

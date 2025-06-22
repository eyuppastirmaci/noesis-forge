import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

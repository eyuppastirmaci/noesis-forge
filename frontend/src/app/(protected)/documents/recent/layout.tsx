import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Documents",
};

export default function RecentDocumentsLayout({ children }: { children: ReactNode }) {
  return children;
}

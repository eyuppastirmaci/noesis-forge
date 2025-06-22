import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Documents",
};

export default function SharedDocumentsLayout({ children }: { children: ReactNode }) {
  return children;
}

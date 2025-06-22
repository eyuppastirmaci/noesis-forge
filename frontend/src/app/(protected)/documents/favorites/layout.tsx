import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorite Documents",
};

export default function FavoriteDocumentsLayout({ children }: { children: ReactNode }) {
  return children;
}

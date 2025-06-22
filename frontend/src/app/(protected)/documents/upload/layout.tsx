import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Documents",
};

export default function UploadDocumentsLayout({ children }: { children: ReactNode }) {
  return children;
}

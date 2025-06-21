import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Documents",
    default: "Documents"
  },
};

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
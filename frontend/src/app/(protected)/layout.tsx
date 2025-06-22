import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return <div className="w-full h-full flex gap-4">
    <Sidebar />
    {children}
  </div>;
}
import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full flex">
      {/* Sidebar - Always rendered, responsive behavior handled in CSS */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
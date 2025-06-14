import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <h1>Dashboard</h1>
      {children}
    </div>
  );
}

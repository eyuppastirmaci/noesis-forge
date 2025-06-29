import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default function ProfilePageLayout({ children }: Props) {
  return children;
}

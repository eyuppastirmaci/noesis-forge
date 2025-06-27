"use client"

import { SessionProvider } from "next-auth/react"
import { useSessionValidator } from "@/hooks"

function SessionValidatorWrapper({ children }: { children: React.ReactNode }) {
  useSessionValidator()
  return <>{children}</>
}

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <SessionValidatorWrapper>{children}</SessionValidatorWrapper>
    </SessionProvider>
  )
}
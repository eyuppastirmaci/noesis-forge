// frontend/types/next-auth.d.ts
import NextAuth from "next-auth"
import { User as AppUser } from "@/types/user"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name: string
    username: string
    roleID: string
    accessToken: string
    refreshToken: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      username: string
      roleID: string
    }
    accessToken: string
    refreshToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    username: string
    roleID: string
    accessToken: string
    refreshToken: string
  }
}
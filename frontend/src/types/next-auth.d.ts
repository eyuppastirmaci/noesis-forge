import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      email: string
      name: string
      username: string
      roleID: string
      avatar?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    username: string
    roleID: string
    accessToken: string
    refreshToken: string
    avatar?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    email?: string
    name?: string
    username?: string
    roleID?: string
    accessToken?: string
    refreshToken?: string
    avatar?: string
  }
}
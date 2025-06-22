import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import { ENV } from "@/config/env"

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        try {
          // Since we're using cookie-based authentication, the login was already 
          // successful in the login action. Just use the provided user info.
          
          return {
            id: credentials.email || credentials.identifier, // Use email as ID
            email: credentials.email || credentials.identifier,
            name: credentials.name || "User",
            username: credentials.username || credentials.identifier,
            roleID: "user",
            accessToken: "cookie-based", // Placeholder - actual auth via cookies
            refreshToken: "cookie-based", // Placeholder - actual auth via cookies
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.username = user.username
        token.roleID = user.roleID
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.username = token.username as string
        session.user.roleID = token.roleID as string
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/register",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      staffId: number
      name: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    staffId: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    staffId: number
  }
}
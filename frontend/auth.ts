import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { 
          label: "メールアドレス", 
          type: "email", 
          placeholder: "例: user@example.com" 
        },
        password: { 
          label: "パスワード", 
          type: "password" 
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // バックエンドAPI経由でユーザー認証
          const response = await fetch(`${getApiHost()}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const user = await response.json()
          
          if (user && user.isActive) {
            return {
              id: user.id,
              email: user.email,
              role: user.role,
              staffId: user.staffId,
              name: user.staff?.name || user.email,
            }
          }
          
          return null
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24時間
  },
  callbacks: {
    async jwt({ token, user }) {
      // 初回ログイン時にユーザー情報をトークンに保存
      if (user) {
        token.role = user.role
        token.staffId = user.staffId
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      // セッションにユーザー情報を含める
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.staffId = token.staffId as number
        session.user.name = token.name as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
})

/**
 * API接続先の動的判定
 */
function getApiHost(): string {
  // サーバーサイド（SSR）の場合
  if (typeof window === 'undefined') {
    return process.env.NEXTAUTH_BACKEND_URL || 'http://localhost:3002'
  }
  
  // クライアントサイドの場合（既存ロジック活用）
  const currentHost = window.location.hostname
  if (currentHost === '10.99.129.21') {
    return 'http://10.99.129.21:3002'
  }
  return 'http://localhost:3002'
}
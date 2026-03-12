import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import type { NextAuthConfig } from "next-auth"
import { ensureUserRole, ensureUserSchool, type UserRole } from "@/lib/users"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
    }
  }
  interface User {
    role?: UserRole
  }
}

export const config: NextAuthConfig = {
  adapter: PostgresAdapter(pool),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
        const role = await ensureUserRole(user.id, user.email)
        session.user.role = role
        // Auto-assign school based on email domain (only if not already assigned)
        if (user.email) {
          await ensureUserSchool(user.id, user.email)
        }
      }
      return session
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

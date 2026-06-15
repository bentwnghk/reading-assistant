import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import type { NextAuthConfig } from "next-auth"
import { ensureUserRole, ensureUserSchool, type UserRole } from "@/lib/users"
import { authConfig } from "@/auth.config"
import { enforceConcurrentSessionLimit } from "@/lib/session-security"

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
  ...authConfig,
  adapter: PostgresAdapter(pool),
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
  events: {
    // #4: Concurrent session limiting — prune old sessions on new sign-in
    async signIn({ user }) {
      if (user.id) {
        await enforceConcurrentSessionLimit(user.id)
      }
    },
  },
  session: {
    strategy: "database",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "259200", 10),
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

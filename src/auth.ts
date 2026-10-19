import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import type { NextAuthConfig } from "next-auth"
import { provisionSessionUser, isUserBanned, refreshGoogleProfile, type UserRole } from "@/lib/users"
import { authConfig } from "@/auth.config"
import { enforceConcurrentSessionLimit } from "@/lib/session-security"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  // Generous on purpose: a brief DB stall/pool saturation must queue and
  // wait, not throw. (A thrown pool.connect()/query during the OAuth
  // callback is masked by NextAuth as /?error=Configuration and the
  // prepared session cookie is dropped — the user stays signed out.)
  connectionTimeoutMillis: 10000,
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
  pages: {
    // AccessDenied errors (banned users) redirect home with ?error=AccessDenied
    // instead of the default built-in error page.
    error: "/",
  },
  callbacks: {
    async signIn({ user }) {
      // Banned users are rejected at sign-in. Returning false throws
      // AccessDenied, which redirects to pages.error.
      // The ban check itself must never fail the sign-in: a transient DB
      // error here would be masked by NextAuth as ?error=Configuration.
      try {
        if (await isUserBanned(user.id, user.email)) {
          return false
        }
      } catch (error) {
        console.error("Sign-in ban check failed; failing open:", error)
      }
      return true
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
        // Role + domain-school provisioning run concurrently and are
        // coalesced across the parallel requests fired at sign-in.
        session.user.role = await provisionSessionUser(user.id, user.email)
      }
      return session
    },
  },
  events: {
    // #4: Concurrent session limiting — prune old sessions on new sign-in
    async signIn({ user, account, profile }) {
      if (!user.id) return
      // This event is awaited before the callback redirect is returned, and
      // NextAuth drops the already-prepared session cookie if it throws —
      // the user would land on /?error=Configuration despite a successful
      // Google auth. Everything here is best-effort by design.
      try {
        if (account?.provider === "google" && profile) {
          await refreshGoogleProfile(user.id, profile)
        }
        await enforceConcurrentSessionLimit(user.id)
      } catch (error) {
        console.error("Post-sign-in event failed (sign-in continues):", error)
      }
    },
  },
  session: {
    strategy: "database",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "259200", 10),
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Lightweight auth config used by middleware (Edge Runtime compatible — no Node.js
// dependencies like `pg`). The full config (with PostgreSQL adapter, role
// callbacks, etc.) lives in src/auth.ts and is used server-side only.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth }) {
      // Return true only when there is an active session.
      return !!auth
    },
  },
}

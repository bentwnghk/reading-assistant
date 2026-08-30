import { auth } from "@/auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isFreeAccessEmail } from "@/lib/free-access"
import {
  FREE_ACCESS_TICKET_COOKIE,
  getSessionToken,
  issueFreeAccessTicket,
} from "@/utils/free-access-ticket"

/**
 * Issues (or clears) the identity-bound free-access ticket cookie for the
 * signed-in user. Called by the client on sign-in and periodically to refresh.
 *
 * - Whitelisted email + session token readable → sets a short-lived httpOnly
 *   ticket cookie bound to the current session token (see free-access-ticket).
 * - Not whitelisted (or signed out) → clears any stale ticket. This also takes
 *   effect for users removed from FREE_ACCESS_EMAILS while still signed in.
 */
export async function GET() {
  const clearTicket = (response: NextResponse) => {
    response.cookies.set(FREE_ACCESS_TICKET_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
  }

  try {
    const session = await auth()
    const granted = !!session?.user?.id && isFreeAccessEmail(session.user.email)
    const response = NextResponse.json({ granted })

    if (!granted) {
      clearTicket(response);
      return response
    }

    const cookieStore = await cookies()
    const sessionToken = getSessionToken({
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          return cookie ? { value: cookie.value } : undefined
        },
      },
    })
    if (!sessionToken) {
      clearTicket(response);
      return response
    }

    const { value, maxAge } = await issueFreeAccessTicket(sessionToken)
    response.cookies.set(FREE_ACCESS_TICKET_COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    })
    return response
  } catch (error) {
    console.error("Error issuing free-access ticket:", error)
    // Fail closed: never report granted on error.
    const response = NextResponse.json({ granted: false })
    clearTicket(response);
    return response
  }
}

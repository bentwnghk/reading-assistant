import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";
import { parseError } from "@/utils/error";

// Authoritative idle-timeout sign-out for the client-side idle timer
// (`useIdleTimer`).
//
// Why a dedicated route instead of next-auth's client `signOut()`: the
// `POST /api/auth/signout` round-trip returns a JSON `{ url }` and any
// server-side failure inside the Auth.js action handler is mapped to
// `pages.error` ("/") with `?error=Configuration` — the client then blindly
// navigates there while the session row is never deleted, leaving the user
// signed in (and on iOS, resurrecting the session on the next reload). This
// route deletes the session row directly and reports explicit success/failure
// so the client only navigates once the sign-out is confirmed server-side.
//
// The session-token cookie is itself the credential: whoever presents it may
// delete its own row — that IS sign-out. No `auth()` call is needed (or
// wanted: it would re-introduce the Auth.js runtime as a failure point).
//
// Methods:
// - POST: JSON `{ ok: true }` — used by the idle timer (fetch + sendBeacon).
// - GET: same deletion, then a 303 redirect to "/" — the last-resort
//   top-level-navigation fallback when POSTs repeatedly fail.

// Session-token cookie names for both http (dev) and https (prod, `__Secure-`
// prefixed) deployments. Mirrors @auth/core's `defaultCookies(useSecureCookies)`.
const SESSION_COOKIE_BASES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

// `generateSessionToken` defaults to a UUID (36 chars), so chunking never
// triggers in practice, but read chunked cookies the same way
// @auth/core's SessionStore does, just in case.
function readSessionToken(
  all: { name: string; value: string }[]
): string | null {
  for (const base of SESSION_COOKIE_BASES) {
    const chunks = all.filter(
      ({ name }) => name === base || name.startsWith(`${base}.`)
    );
    if (chunks.length === 0) continue;
    const value = chunks
      .sort((a, b) => {
        const aSuffix = parseInt(a.name.split(".").pop() || "0");
        const bSuffix = parseInt(b.name.split(".").pop() || "0");
        return aSuffix - bSuffix;
      })
      .map(({ value }) => value)
      .join("");
    if (value) return value;
  }
  return null;
}

function clearSessionCookies(response: NextResponse): NextResponse {
  for (const base of SESSION_COOKIE_BASES) {
    const attrs = base.startsWith("__Secure-")
      ? "Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure"
      : "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    response.headers.append("Set-Cookie", `${base}=; ${attrs}`);
  }
  return response;
}

async function performSignOut(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = readSessionToken(cookieStore.getAll());
  if (sessionToken) {
    // Same table/column as @auth/pg-adapter's deleteSession. Deleting by
    // token only ever signs out this device, not the user's other sessions.
    await getPool().query(`delete from sessions where "sessionToken" = $1`, [
      sessionToken,
    ]);
  }
}

export async function POST() {
  try {
    await performSignOut();
    return clearSessionCookies(NextResponse.json({ ok: true }));
  } catch (error) {
    const message = parseError(error);
    console.error(`[api/auth/idle-timeout] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await performSignOut();
  } catch (error) {
    const message = parseError(error);
    console.error(`[api/auth/idle-timeout] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return clearSessionCookies(
    NextResponse.redirect(new URL("/", request.url), 303)
  );
}

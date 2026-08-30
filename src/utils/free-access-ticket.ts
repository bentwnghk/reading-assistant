/**
 * Identity-bound free-access tickets.
 *
 * Grants users whose email matches FREE_ACCESS_EMAILS access to the AI proxies
 * WITHOUT ever sharing the Access Password with the client. A ticket is an
 * HMAC-SHA256-signed value (keyed with AUTH_SECRET) that is:
 *
 *   1. Bound to the caller's NextAuth session token (SHA-256 hash embedded) —
 *      a copied ticket is useless without the matching session cookie.
 *   2. Short-lived (24h default) — clients refresh via /api/free-access/ticket.
 *   3. httpOnly — never readable from page JavaScript.
 *
 * Uses only Web Crypto (crypto.subtle) and btoa/atob so the same module works
 * in the Edge middleware, Edge route handlers, and the Node runtime.
 */

export const FREE_ACCESS_TICKET_COOKIE = "free_access_ticket";
export const FREE_ACCESS_TICKET_TTL_MS = 24 * 60 * 60 * 1000;

/** NextAuth v5 default session-token cookie names (http / https). */
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

interface CookieReader {
  cookies: {
    get(name: string): { value: string } | undefined;
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function encode(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const out = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  out.set(encoded);
  return out;
}

async function hmacSha256(
  secret: string,
  message: string
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encode(message)));
}

async function sha256(data: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encode(data)));
}

/** Reads the caller's opaque NextAuth session token from request cookies. */
export function getSessionToken(request: CookieReader): string {
  for (const name of SESSION_COOKIE_NAMES) {
    const value = request.cookies.get(name)?.value;
    if (value) return value;
  }
  return "";
}

/**
 * Issues a ticket bound to the given session token. Returns the cookie value
 * plus its maxAge (seconds) so the caller can set an aligned cookie expiry.
 */
export async function issueFreeAccessTicket(
  sessionToken: string,
  ttlMs: number = FREE_ACCESS_TICKET_TTL_MS
): Promise<{ value: string; maxAge: number }> {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret || !sessionToken) {
    throw new Error("Cannot issue free-access ticket: missing prerequisites");
  }
  const exp = Date.now() + ttlMs;
  const payload = `${exp}.${toBase64Url(await sha256(sessionToken))}`;
  const signature = await hmacSha256(secret, `free-access:${payload}`);
  return {
    value: `${payload}.${toBase64Url(signature)}`,
    maxAge: Math.floor(ttlMs / 1000),
  };
}

/**
 * Verifies the request's free-access ticket: valid HMAC (AUTH_SECRET), not
 * expired, and bound to the request's current session token. Returns false for
 * any malformed input, missing cookie, or missing AUTH_SECRET.
 */
export async function hasValidFreeAccessTicket(
  request: CookieReader
): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || "";
  const ticket = request.cookies.get(FREE_ACCESS_TICKET_COOKIE)?.value || "";
  if (!secret || !ticket) return false;

  const parts = ticket.split(".");
  if (parts.length !== 3) return false;
  const [expPart, sessionHashPart, signaturePart] = parts;

  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const expectedSignature = await hmacSha256(
    secret,
    `free-access:${expPart}.${sessionHashPart}`
  );
  if (!timingSafeEqual(expectedSignature, fromBase64Url(signaturePart))) {
    return false;
  }

  const sessionToken = getSessionToken(request);
  if (!sessionToken) return false;
  return timingSafeEqual(await sha256(sessionToken), fromBase64Url(sessionHashPart));
}

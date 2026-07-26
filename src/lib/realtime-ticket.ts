/**
 * App-side HMAC ticket issuer for the realtime (Socket.io) server.
 *
 * This MIRRORS the format in `realtime/src/auth.ts`. The two packages are
 * standalone (the app does not import from `realtime/`), so the signing logic
 * is duplicated here. The format is:
 *
 *   ticket = `${base64url(payload)}.${base64url(signature)}`
 *   payload = { userId, name, image, role, schoolId, exp }
 *   signature = HMAC-SHA256(base64url(payload), AUTH_SECRET)
 *
 * The realtime server verifies the signature with the shared AUTH_SECRET.
 * Keep both implementations in sync.
 */
import { createHmac } from "crypto";

const TICKET_TTL_MS = 30_000;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — cannot issue realtime ticket");
  }
  return secret;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface TicketPayload {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  schoolId: string | null;
  classId: string | null;
  exp: number;
}

export interface RealtimeTicketUser {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  schoolId: string | null;
  classId: string | null;
}

/**
 * Issue a short-lived HMAC-signed ticket. The client passes this to the
 * realtime server in the Socket.io handshake `auth.token`. The ticket is
 * self-contained (no DB lookup needed server-side) and expires quickly, so a
 * leaked ticket has a narrow abuse window.
 */
export function issueRealtimeTicket(
  user: RealtimeTicketUser,
  ttlMs: number = TICKET_TTL_MS,
): string {
  const payload: TicketPayload = {
    userId: user.userId,
    name: user.name,
    image: user.image,
    role: user.role,
    schoolId: user.schoolId,
    classId: user.classId,
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getAuthSecret()).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

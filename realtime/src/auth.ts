/**
 * Authentication for the realtime server.
 *
 * Design: the Next.js app issues a short-lived HMAC-signed "ticket" via the
 * `/api/realtime/ticket` endpoint (auth-gated). The client passes this ticket
 * in the Socket.io handshake `auth.token`. The realtime server verifies the
 * ticket's HMAC signature (using the shared `AUTH_SECRET`) and expiry — no DB
 * lookup needed, so auth is fast and the realtime server has no hard DB
 * dependency at connection time.
 *
 * Ticket format: `${base64url(payload)}.${base64url(signature)}`
 * Payload:      `{ userId, name, image, role, schoolId, classId, classIds, exp }`
 *
 * `classId` is the legacy single-class field (first membership); `classIds` is
 * the full multi-class list. verifyTicket normalizes to classIds[] (accepting
 * either field) so the app and realtime images may deploy in any order.
 * MIRRORS `src/lib/realtime-ticket.ts` in the app — keep both in sync.
 *
 * Trade-off: a ticket authenticates the connection handshake only. If a user's
 * NextAuth session is revoked mid-connection, the socket stays alive until
 * disconnect. Acceptable for v1 (NextAuth session pruning handles sign-out).
 */
import { createHmac, timingSafeEqual } from "crypto";

import { config } from "./config";
import type { UserRole } from "./game/types";

export interface AuthenticatedUser {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  schoolId: string | null;
  /** Legacy single-class field (first membership) — kept for rolling deploys */
  classId: string | null;
  /** All class memberships (multi-class capable) */
  classIds: string[];
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(payloadB64: string): string {
  const sig = createHmac("sha256", config.authSecret).update(payloadB64).digest();
  return base64UrlEncode(sig);
}

/** Issue a ticket. Called by the app's /api/realtime/ticket endpoint. */
export function issueTicket(user: AuthenticatedUser, ttlMs: number = config.ticketTtlMs): string {
  const payload = {
    userId: user.userId,
    name: user.name,
    image: user.image,
    role: user.role,
    schoolId: user.schoolId,
    classId: user.classId,
    classIds: user.classIds,
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sigB64 = sign(payloadB64);
  return `${payloadB64}.${sigB64}`;
}

/** Verify a ticket received in a Socket.io handshake. Returns null if invalid/expired. */
export function verifyTicket(ticket: string | undefined): AuthenticatedUser | null {
  if (!ticket || typeof ticket !== "string") return null;
  const dot = ticket.lastIndexOf(".");
  if (dot <= 0 || dot === ticket.length - 1) return null;

  const payloadB64 = ticket.slice(0, dot);
  const sigB64 = ticket.slice(dot + 1);

  // Constant-time signature comparison.
  const expected = sign(payloadB64);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(sigB64);
  if (expectedBuf.length !== providedBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, providedBuf)) return null;

  let payload: {
    userId?: unknown;
    name?: unknown;
    image?: unknown;
    role?: unknown;
    schoolId?: unknown;
    classId?: unknown;
    classIds?: unknown;
    exp?: unknown;
  };
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
  if (typeof payload.role !== "string") return null;

  // Normalize memberships: prefer classIds[]; fall back to legacy classId so
  // old-signer/new-verifier (and vice versa) deploys keep working.
  let classIds: string[] = [];
  if (Array.isArray(payload.classIds)) {
    classIds = payload.classIds.filter((id): id is string => typeof id === "string");
  }
  const legacyClassId = typeof payload.classId === "string" ? payload.classId : null;
  if (classIds.length === 0 && legacyClassId) {
    classIds = [legacyClassId];
  }

  return {
    userId: payload.userId,
    name: typeof payload.name === "string" ? payload.name : null,
    image: typeof payload.image === "string" ? payload.image : null,
    role: payload.role as UserRole,
    schoolId: typeof payload.schoolId === "string" ? payload.schoolId : null,
    classId: classIds.length > 0 ? classIds[0] : null,
    classIds,
  };
}

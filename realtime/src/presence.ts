/**
 * Online presence tracking.
 *
 * Tracks which users are currently connected (one entry per user — the latest
 * socket wins if a user opens multiple tabs). Used for:
 *   - class-battle broadcasts (find connected students in a target class)
 *   - room membership sanity checks
 *
 * Auth is ticket-based (DB-free); classId is resolved once on connect via a
 * best-effort DB query (null if the DB is unreachable or the user has no
 * class — class battles gracefully degrade).
 */
import type { UserRole } from "./game/types";

export interface PresenceEntry {
  userId: string;
  socketId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  schoolId: string | null;
  classId: string | null;
}

const presence = new Map<string, PresenceEntry>(); // userId -> entry

export function registerPresence(entry: PresenceEntry): void {
  presence.set(entry.userId, entry);
}

/**
 * Unregister the presence entry whose current socketId matches. Returns the
 * userId that was removed, or null if no entry matched (e.g. a newer
 * connection already replaced this socket).
 */
export function unregisterPresenceBySocket(socketId: string): string | null {
  for (const [userId, entry] of presence) {
    if (entry.socketId === socketId) {
      presence.delete(userId);
      return userId;
    }
  }
  return null;
}

export function getPresence(userId: string): PresenceEntry | null {
  return presence.get(userId) ?? null;
}

/** Update the socketId for an existing user (e.g. reconnect from a new tab). */
export function rebindSocket(userId: string, socketId: string): boolean {
  const entry = presence.get(userId);
  if (!entry) return false;
  entry.socketId = socketId;
  return true;
}

/** Connected user ids whose classId matches (for class-battle broadcasts). */
export function getConnectedSocketIdsInClass(classId: string): string[] {
  const socketIds: string[] = [];
  for (const entry of presence.values()) {
    if (entry.classId === classId) socketIds.push(entry.socketId);
  }
  return socketIds;
}

export function presenceSize(): number {
  return presence.size;
}

/**
 * Online presence tracking.
 *
 * Tracks which users are currently connected (one entry per user — the latest
 * socket wins if a user opens multiple tabs). Used for:
 *   - class-battle broadcasts (find connected students in a target class)
 *   - room membership sanity checks
 *
 * Auth is ticket-based (DB-free); classIds are resolved once on connect via a
 * best-effort DB query (empty if the DB is unreachable or the user has no
 * class — class battles gracefully degrade). A user may belong to multiple
 * classes and receives broadcasts for each of them.
 */
import type { UserRole } from "./game/types";

export interface PresenceEntry {
  userId: string;
  socketId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  schoolId: string | null;
  /** Legacy single-class field (first membership) */
  classId: string | null;
  /** All class memberships (multi-class capable) */
  classIds: string[];
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

/** Connected socket ids of users belonging to the class (for class-battle broadcasts). */
export function getConnectedSocketIdsInClass(classId: string): string[] {
  const socketIds: string[] = [];
  for (const entry of presence.values()) {
    if (entry.classIds.includes(classId)) socketIds.push(entry.socketId);
  }
  return socketIds;
}

/** Connected socket ids for the given user ids (for roster-battle broadcasts). */
export function getConnectedSocketIdsForUsers(userIds: Set<string>): string[] {
  const socketIds: string[] = [];
  for (const userId of userIds) {
    const entry = presence.get(userId);
    if (entry) socketIds.push(entry.socketId);
  }
  return socketIds;
}

export function presenceSize(): number {
  return presence.size;
}

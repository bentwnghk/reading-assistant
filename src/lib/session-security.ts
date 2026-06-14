import { getClient } from "./db";
import type { UserRole } from "./users";

const IDLE_TIMEOUT_MINUTES = parseInt(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30",
  10
);
const MAX_CONCURRENT_SESSIONS = parseInt(
  process.env.MAX_CONCURRENT_SESSIONS || "3",
  10
);
const ACTIVITY_UPDATE_INTERVAL_MINUTES = parseInt(
  process.env.SESSION_ACTIVITY_UPDATE_INTERVAL || "5",
  10
);

interface SessionRow {
  sessionToken: string;
  userId: string;
  expires: Date;
  lastActivityAt: Date | null;
}

export async function getSessionByToken(
  sessionToken: string
): Promise<SessionRow | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT "sessionToken", "userId", expires, last_activity_at as "lastActivityAt"
       FROM sessions WHERE "sessionToken" = $1`,
      [sessionToken]
    );
    return result.rows.length > 0
      ? (result.rows[0] as SessionRow)
      : null;
  } catch {
    return null;
  } finally {
    client.release();
  }
}

export async function updateSessionActivity(
  sessionToken: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE sessions SET last_activity_at = NOW() WHERE "sessionToken" = $1`,
      [sessionToken]
    );
  } catch (error) {
    console.error("Failed to update session activity:", error);
  } finally {
    client.release();
  }
}

export function isSessionIdleExpired(
  lastActivityAt: Date | string | null
): boolean {
  if (!lastActivityAt) return false;
  const idleMs = IDLE_TIMEOUT_MINUTES * 60 * 1000;
  const lastActivity = new Date(lastActivityAt).getTime();
  return Date.now() - lastActivity > idleMs;
}

export function shouldUpdateActivity(
  lastActivityAt: Date | string | null
): boolean {
  if (!lastActivityAt) return true;
  const intervalMs = ACTIVITY_UPDATE_INTERVAL_MINUTES * 60 * 1000;
  const lastActivity = new Date(lastActivityAt).getTime();
  return Date.now() - lastActivity > intervalMs;
}

export async function destroySession(sessionToken: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `DELETE FROM sessions WHERE "sessionToken" = $1`,
      [sessionToken]
    );
  } catch (error) {
    console.error("Failed to destroy session:", error);
  } finally {
    client.release();
  }
}

export async function enforceConcurrentSessionLimit(
  userId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `DELETE FROM sessions
       WHERE "userId" = $1
       AND "sessionToken" NOT IN (
         SELECT "sessionToken" FROM sessions
         WHERE "userId" = $1
         ORDER BY "createdAt" DESC
         LIMIT $2
       )`,
      [userId, MAX_CONCURRENT_SESSIONS]
    );
  } catch (error) {
    console.error("Failed to enforce concurrent session limit:", error);
  } finally {
    client.release();
  }
}

interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
}

export async function hasLapsedSubscription(
  userId: string,
  role: UserRole
): Promise<boolean> {
  if (role === "super-admin" || role === "admin") return false;

  try {
    const { verifySchoolSubscriptionAccess } = await import(
      "./school-subscription"
    );
    if (await verifySchoolSubscriptionAccess(userId)) return false;
  } catch {
    // If school sub check fails, continue to individual check
  }

  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT status, current_period_end FROM subscriptions
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const sub = result.rows[0] as SubscriptionRow;

    // Only invalidate for subscriptions that were previously active and have
    // definitively ended. Ignore transitional/never-active states so that free
    // users with stale checkout or trial records are not locked out.
    if (sub.status !== "canceled" && sub.status !== "unpaid") return false;

    if (sub.current_period_end) {
      const periodEnd = new Date(sub.current_period_end);
      if (periodEnd > new Date()) return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to check subscription status:", error);
    return false;
  } finally {
    client.release();
  }
}

export { IDLE_TIMEOUT_MINUTES, MAX_CONCURRENT_SESSIONS };

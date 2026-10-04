import { getPool } from "@/lib/db";
import type { SettingStore } from "@/store/setting";

/**
 * Free Trial Access — the onboarding wizard's "Try free trial" option.
 *
 * Users without an Access Password, an API key, or a subscription can start a
 * time-boxed trial (FREE_TRIAL_DAYS, default 0 = feature disabled). While the
 * trial is active:
 *
 *   - /api/free-access/ticket issues the identity-bound free-access ticket,
 *     so all middleware access gates (AI providers, search, crawler, SSE,
 *     MCP) accept the user exactly like a FREE_ACCESS_EMAILS user;
 *   - visualization generation is capped at VISUALIZATION_DAILY_LIMIT_FREE
 *     images per day (the route's existing non-subscriber limit);
 *   - one trial per user, ever — the user_trials PRIMARY KEY makes a second
 *     start a no-op.
 */

export interface TrialStatus {
  /** Whether the feature is enabled on this deployment (FREE_TRIAL_DAYS > 0). */
  enabled: boolean;
  /** Configured trial length in days. */
  days: number;
  /** Whether THIS user currently has an active (unexpired) trial. */
  active: boolean;
  /** Whether this user has already consumed a trial (started one before). */
  usedBefore: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  /** Visualization generations allowed per day during the trial. */
  visualizationDailyLimit: number;
}

export function getTrialDays(): number {
  const days = parseInt(process.env.FREE_TRIAL_DAYS || "0", 10);
  return Number.isFinite(days) && days > 0 ? days : 0;
}

export function getTrialVisualizationDailyLimit(): number {
  const limit = parseInt(
    process.env.VISUALIZATION_DAILY_LIMIT_FREE || "1",
    10
  );
  return Number.isFinite(limit) && limit > 0 ? limit : 1;
}

let tableEnsured = false;

export async function ensureTrialTable(): Promise<void> {
  if (tableEnsured) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS user_trials (
      user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `);
  tableEnsured = true;
}

interface TrialRow {
  started_at: Date;
  expires_at: Date;
}

async function getTrialRow(userId: string): Promise<TrialRow | null> {
  await ensureTrialTable();
  const result = await getPool().query(
    `SELECT started_at, expires_at FROM user_trials WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** Whether the user's trial exists and has not expired yet. */
export async function hasActiveTrial(userId: string): Promise<boolean> {
  try {
    const row = await getTrialRow(userId);
    if (!row) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  } catch (error) {
    console.error("Error checking trial status:", error);
    return false;
  }
}

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const days = getTrialDays();
  const row = await getTrialRow(userId);
  const expiresAt = row ? new Date(row.expires_at) : null;

  return {
    enabled: days > 0,
    days,
    active: !!expiresAt && expiresAt.getTime() > Date.now(),
    usedBefore: !!row,
    startedAt: row ? new Date(row.started_at).toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    visualizationDailyLimit: getTrialVisualizationDailyLimit(),
  };
}

/**
 * Defaults active-trial users onto Free (proxy) billing mode so their AI
 * requests ride the identity-bound ticket (see applyFreeAccessSettings for
 * the FREE_ACCESS_EMAILS equivalent). Only flips the unconfigured default
 * ("subscription") — a user who deliberately picked "local" (own API key) or
 * "proxy" (own password) keeps their choice. The trial ticket covers proxy
 * requests regardless of which accessPassword is stored.
 */
export async function applyTrialSettings(
  userId: string,
  settings: Partial<SettingStore>
): Promise<{ settings: Partial<SettingStore>; changed: boolean }> {
  if (settings.mode && settings.mode !== "subscription") {
    return { settings, changed: false };
  }
  if (!(await hasActiveTrial(userId))) {
    return { settings, changed: false };
  }
  return {
    settings: { ...settings, mode: "proxy" },
    changed: true,
  };
}

/**
 * Starts the user's trial. Idempotent per user: if a row already exists the
 * existing status is returned unchanged (one trial per user, ever — expired
 * trials are NOT renewable). Returns null when the feature is disabled.
 */
export async function startTrial(
  userId: string
): Promise<TrialStatus | null> {
  const days = getTrialDays();
  if (days <= 0) return null;

  await ensureTrialTable();
  // ON CONFLICT DO NOTHING keeps the first row (one trial per user, ever).
  await getPool().query(
    `INSERT INTO user_trials (user_id, expires_at)
     VALUES ($1, NOW() + make_interval(days => $2))
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, days]
  );

  return getTrialStatus(userId);
}

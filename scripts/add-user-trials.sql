-- ─── Free Trial Access (onboarding wizard "Try free trial" option) ────────────
-- One trial per user, ever: the PRIMARY KEY on user_id makes a second start a
-- no-op. Trial length is server-side env FREE_TRIAL_DAYS (0/absent = feature
-- disabled). While active, the user receives the identity-bound free-access
-- ticket (see /api/free-access/ticket) and is limited to
-- VISUALIZATION_DAILY_LIMIT_FREE image generations per day.

CREATE TABLE IF NOT EXISTS user_trials (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_trials_expires ON user_trials(expires_at);

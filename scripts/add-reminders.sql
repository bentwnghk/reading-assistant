-- ─── Email Reminder tables ──────────────────────────────────────────────────

-- Tracks sent email reminders to prevent duplicate sends within a throttle window.
CREATE TABLE IF NOT EXISTS email_reminder_logs (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_inactive       INTEGER NOT NULL,
  last_activity_type  TEXT,
  last_activity_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_user ON email_reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_sent ON email_reminder_logs(sent_at DESC);

-- User email reminder preferences (separate from user_settings to avoid sync conflicts).
CREATE TABLE IF NOT EXISTS email_reminder_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  frequency_days  INTEGER NOT NULL DEFAULT 3 CHECK (frequency_days >= 1),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_reminder_preferences_user ON email_reminder_preferences(user_id);

CREATE TRIGGER update_email_reminder_preferences_updated_at
    BEFORE UPDATE ON email_reminder_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Reminder frequency options update ──────────────────────────────────────
-- Dropdown options changed from {1, 2, 3, 5, 7, 14} to {3, 5, 7, 14, 21, 30};
-- default changed from 3 to 7.
-- Users who previously selected 1, 2, 3 or 5 days are moved to the new default of 7.

UPDATE email_reminder_preferences
   SET frequency_days = 7, updated_at = NOW()
 WHERE frequency_days IN (1, 2, 3, 5);

ALTER TABLE email_reminder_preferences
  ALTER COLUMN frequency_days SET DEFAULT 7;

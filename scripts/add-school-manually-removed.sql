-- Prevents ensureUserSchool() from auto-reassigning a user to a school
-- based on their email domain after their access was explicitly revoked.
-- Cleared when an admin manually assigns the user to a new school.

ALTER TABLE users ADD COLUMN IF NOT EXISTS school_manually_removed BOOLEAN DEFAULT FALSE;

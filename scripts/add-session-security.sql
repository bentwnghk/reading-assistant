-- Migration: Add index for concurrent session limiting
--
-- Supports feature #4: Concurrent session limiting — old sessions are pruned
-- on new sign-in by querying sessions per user.

-- Create index for efficient per-user session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");

-- Drop unused columns from a previous version of this migration
ALTER TABLE sessions DROP COLUMN IF EXISTS last_activity_at;
DROP INDEX IF EXISTS idx_sessions_last_activity;

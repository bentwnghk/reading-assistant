-- Add school_access_ends_at column to users table.
-- When set, the user's school subscription access will be revoked after this timestamp.
-- A cron job periodically cleans up expired entries by setting school_id = NULL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_access_ends_at TIMESTAMP WITH TIME ZONE;

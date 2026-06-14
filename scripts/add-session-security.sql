-- Migration: Add session security columns for sliding inactivity timeout (#3)
-- and concurrent session limiting (#4)
--
-- This migration adds a `last_activity_at` column to the NextAuth `sessions`
-- table to support:
--   - Sliding inactivity timeout: sessions expire after a configurable idle period
--   - Concurrent session limiting: old sessions are pruned on new sign-in

-- Add last_activity_at column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing sessions: use createdAt as the initial activity timestamp
UPDATE sessions SET last_activity_at = "createdAt" WHERE last_activity_at IS NULL;

-- Add index on userId for efficient concurrent session cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");

-- Add index on last_activity_at for efficient idle session detection
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);

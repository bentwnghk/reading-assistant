-- Migration: Add shared_sessions table for reading session sharing
-- Run this after init-db.sql

CREATE TABLE IF NOT EXISTS shared_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  doc_title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_sessions_recipient_status
  ON shared_sessions(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_shared_sessions_sender
  ON shared_sessions(sender_id);

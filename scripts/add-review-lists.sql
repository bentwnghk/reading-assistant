-- Migration: Add review lists and shared review lists tables

CREATE TABLE IF NOT EXISTS review_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_review_lists_created_by ON review_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_review_lists_created_at ON review_lists(created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_review_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_list_id TEXT NOT NULL REFERENCES review_lists(id) ON DELETE CASCADE,
  review_list_name TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_review_lists_recipient ON shared_review_lists(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_shared_review_lists_sender ON shared_review_lists(sender_id);

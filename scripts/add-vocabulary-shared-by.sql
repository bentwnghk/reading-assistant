-- Migration: Add shared_by column to user_vocabulary for tracking word source
-- Words shared by a teacher/admin/super-admin will have shared_by set to their user_id
-- Own words will have shared_by = NULL

ALTER TABLE user_vocabulary
  ADD COLUMN IF NOT EXISTS shared_by TEXT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_shared_by ON user_vocabulary(user_id, shared_by);

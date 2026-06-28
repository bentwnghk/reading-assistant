-- Migration: Add Assignment Presets (saved student rosters)
-- Run this after add-assignments.sql
--
-- Design:
--   assignment_presets = a teacher's named, reusable group of student ids.
--   Lets teachers quickly re-select a roster when creating assignments
--   instead of re-picking individual students each time.
--   student_ids is a JSONB array of user ids; stale ids (students who left
--   the school) are silently filtered client-side and server-side at
--   assignment-create time.

CREATE TABLE IF NOT EXISTS assignment_presets (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (teacher_id, name)
);

CREATE INDEX IF NOT EXISTS idx_assignment_presets_teacher
  ON assignment_presets(teacher_id);

CREATE TRIGGER update_assignment_presets_updated_at
    BEFORE UPDATE ON assignment_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

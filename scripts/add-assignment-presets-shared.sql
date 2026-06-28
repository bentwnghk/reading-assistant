-- Migration: Make assignment presets shared school-wide (not teacher-private)
-- Run this after add-assignment-presets.sql
--
-- Design change:
--   Previously presets were scoped to a single teacher (UNIQUE(teacher_id, name)).
--   Now presets are shared across all teachers in the same school so any teacher
--   can reuse a roster created by a colleague.
--
--   - teacher_id is retained as the creator (who made the roster).
--   - school_id drives visibility: teachers/admins in the same school see all
--     presets; super-admins see everything.
--   - Names are now unique per-school (UNIQUE(school_id, name)) instead of
--     per-teacher.

-- 1. Add school_id column (nullable during backfill)
ALTER TABLE assignment_presets
  ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES schools(id) ON DELETE CASCADE;

-- 2. Backfill school_id from each preset creator's school
UPDATE assignment_presets p
  SET school_id = u.school_id
  FROM users u
  WHERE p.teacher_id = u.id
    AND p.school_id IS NULL;

-- 3. Make school_id NOT NULL now that it's backfilled
ALTER TABLE assignment_presets
  ALTER COLUMN school_id SET NOT NULL;

-- 4. Switch the uniqueness constraint from per-teacher to per-school
ALTER TABLE assignment_presets
  DROP CONSTRAINT IF EXISTS assignment_presets_teacher_id_name_key;
ALTER TABLE assignment_presets
  ADD CONSTRAINT assignment_presets_school_id_name_key UNIQUE (school_id, name);

-- 5. Index for school-scoped lookups
CREATE INDEX IF NOT EXISTS idx_assignment_presets_school
  ON assignment_presets(school_id);

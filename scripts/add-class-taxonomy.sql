-- Migration: Add managed subject & grade (form) taxonomy for classes
-- Schools manage their own subject and form/grade lists; classes optionally
-- reference one of each. Both are school-scoped and uniquely named per school.
-- Run after add-multi-class-members.sql (independent of it functionally).

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (school_id, name)
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_id ON classes(grade_id);

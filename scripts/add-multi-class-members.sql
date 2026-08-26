-- Migration: Allow a student to belong to multiple classes
-- Re-keys class_members from PRIMARY KEY (student_id) to (class_id, student_id).
-- Lossless: every student has at most one membership row under the old PK.
-- NOTE: deploy together with the application code that writes memberships —
-- the old ON CONFLICT (student_id) clauses error against this new PK and vice versa.

ALTER TABLE class_members DROP CONSTRAINT class_members_pkey;
ALTER TABLE class_members ADD PRIMARY KEY (class_id, student_id);

-- Preserve fast per-student lookups previously covered by the old PK.
CREATE INDEX IF NOT EXISTS idx_class_members_student_id ON class_members(student_id);

-- Migration: Add Assignments feature (Language-across-the-Curriculum homework)
-- Run this after init-db.sql and add-shared-sessions.sql
--
-- Design:
--   assignments                 = a teacher's homework task with a frozen content snapshot
--   assignment_submissions      = one row per (assignment, student) with cached metrics
--   reading_sessions.assignment_id = soft link from a student's working session back to the
--                                    assignment; used by the metric-sync write path
--
-- Storage: heavy image data (reading_images rows) is NOT duplicated per student.
-- The frozen source snapshot on `assignments.source_session_snapshot` is the only copy.
-- extracted_text/summary/etc. are still copied per student (acceptable size; simplicity win).

-- 1. Allow reading_sessions.source to mark assignment-derived sessions
ALTER TABLE reading_sessions
  DROP CONSTRAINT IF EXISTS reading_sessions_source_check;
ALTER TABLE reading_sessions
  ADD CONSTRAINT reading_sessions_source_check
  CHECK (source IN ('upload', 'repository', 'shared', 'assignment'));

-- 2. Soft link from a student's working session to its assignment (nullable, no FK)
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS assignment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reading_sessions_assignment
  ON reading_sessions(assignment_id);

-- 3. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  description              TEXT DEFAULT '',
  subject                  TEXT DEFAULT '',
  source_session_id        TEXT,
  source_session_snapshot  JSONB NOT NULL,
  source_doc_title         TEXT DEFAULT '',
  due_date                 TIMESTAMP WITH TIME ZONE,
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'archived')),
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher
  ON assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_due
  ON assignments(due_date);

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Submissions table (one row per student per assignment)
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id                         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id              TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_session_id         TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  -- cached metrics, kept in sync from updateReadingSession:
  progress                   INTEGER NOT NULL DEFAULT 0,
  test_score                 INTEGER,
  test_completed             BOOLEAN NOT NULL DEFAULT FALSE,
  vocabulary_quiz_score      INTEGER,
  spelling_game_best_score   INTEGER,
  grammar_quiz_score         INTEGER,
  grammar_game_best_score    INTEGER,
  grammar_game_accuracy      INTEGER,
  last_viewed_at             TIMESTAMP WITH TIME ZONE,
  submitted_at               TIMESTAMP WITH TIME ZONE,
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_student
  ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment
  ON assignment_submissions(assignment_id);

-- 5. Activity log: new activity types for assignment lifecycle
--    (the activity_type CHECK is re-created to include the new values
--     alongside the full canonical list from init-db.sql)
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;
ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_activity_type_check
  CHECK (activity_type IN (
    'session_create',
    'test_complete',
    'quiz_complete',
    'spelling_complete',
    'flashcard_review',
    'mindmap_generate',
    'adapted_text_generate',
    'simplified_text_generate',
    'sentence_analyze',
    'targeted_practice_complete',
    'glossary_add',
    'grammar_analyze',
    'grammar_quiz_complete',
    'grammar_scramble_complete',
    'grammar_workshop_complete',
    'grammar_surgery_complete',
    'grammar_roulette_complete',
    'grammar_duel_complete',
    'ai_tutor_question',
    'visualization_generate',
    'assignment_create',
    'assignment_start',
    'assignment_submit'
  ));

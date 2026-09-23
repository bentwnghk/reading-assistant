-- ─── Incremental migration: clean up orphaned un-started assignment copies ────
--
-- One-time data cleanup. Before deleteAssignment() began removing un-started
-- student copies (see src/lib/assignments.ts), deleting an assignment left
-- every student's working copy behind in reading_sessions with a dangling
-- assignment_id (soft link, no FK). Those rows still surface in the Student
-- Dashboard and — for admin/super-admin viewers — the Teacher Dashboard and
-- the Student Data tab.
--
-- This migration deletes the orphaned copies that show NO student-authored
-- work. "Un-started" here includes copies the student opened but never
-- worked in: merely opening an assignment only stamped last_viewed_at on the
-- (now cascaded-away) assignment_submissions row and writes none of the
-- fields checked below.
--
--   deleted  = source 'assignment' + no matching assignments row
--   kept     = anything with student work (prediction, answers, scores,
--              game counters, chat, glossary ratings)
--
-- The field list mirrors UNSTARTED_SESSION_SQL in src/lib/assignments.ts —
-- keep the two in sync when adding student-authored columns.
--
-- Safe to re-run: the DELETE matches nothing once no orphans remain.

-- Preview the rows that will be removed (run alone first if you want a look):
-- SELECT r.id, r.user_id, r.doc_title, to_timestamp(r.created_at / 1000.0) AS created
-- FROM reading_sessions r
-- WHERE r.source = 'assignment'
--   AND r.assignment_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM assignments a WHERE a.id = r.assignment_id
--   )
--   AND COALESCE(r.student_prediction, '') = ''
--   AND r.test_completed = FALSE
--   AND COALESCE(r.tests_completed, 0) = 0
--   AND COALESCE(r.vocab_quizzes_completed, 0) = 0
--   AND COALESCE(r.spelling_games_completed, 0) = 0
--   AND COALESCE(r.grammar_quizzes_completed, 0) = 0
--   AND COALESCE(r.grammar_games_completed, 0) = 0
--   AND COALESCE(r.chat_history, '[]'::jsonb) = '[]'::jsonb
--   AND COALESCE(r.glossary_ratings, '{}'::jsonb) = '{}'::jsonb;

DELETE FROM reading_sessions r
WHERE r.source = 'assignment'
  AND r.assignment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assignments a WHERE a.id = r.assignment_id
  )
  AND COALESCE(r.student_prediction, '') = ''
  AND r.test_completed = FALSE
  AND COALESCE(r.tests_completed, 0) = 0
  AND COALESCE(r.vocab_quizzes_completed, 0) = 0
  AND COALESCE(r.spelling_games_completed, 0) = 0
  AND COALESCE(r.grammar_quizzes_completed, 0) = 0
  AND COALESCE(r.grammar_games_completed, 0) = 0
  AND COALESCE(r.chat_history, '[]'::jsonb) = '[]'::jsonb
  AND COALESCE(r.glossary_ratings, '{}'::jsonb) = '{}'::jsonb
RETURNING r.id, r.user_id, r.doc_title;

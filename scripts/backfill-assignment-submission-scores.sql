-- ─── Incremental migration: normalize cached assignment submission scores ──────
-- Safe to re-run (idempotent). Only touches rows where the linked reading session
-- shows the activity as NOT completed; a genuine 0 score (activity completed but
-- earned 0 points) is preserved.
--
-- Background: syncSubmissionMetrics previously coerced NULL → 0 when caching
-- session scores into assignment_submissions, so "not started" and a real 0 were
-- indistinguishable in the roster. The roster renders NULL as "-" and 0 as "0".
-- This migration restores the NULL sentinel for not-yet-attempted activities by
-- joining each submission to its source reading_sessions row and checking the
-- per-activity completion flag.
-- See: src/lib/assignments.ts (syncSubmissionMetrics).

BEGIN;

-- Reading test: NULL when the test has not been completed.
UPDATE assignment_submissions s
SET test_score = NULL
FROM reading_sessions rs
WHERE s.student_session_id = rs.id
  AND COALESCE(rs.test_completed, false) = false
  AND s.test_score IS NOT NULL;

-- Vocabulary quiz: NULL when no quiz has been completed.
UPDATE assignment_submissions s
SET vocabulary_quiz_score = NULL
FROM reading_sessions rs
WHERE s.student_session_id = rs.id
  AND COALESCE(rs.vocab_quizzes_completed, 0) = 0
  AND s.vocabulary_quiz_score IS NOT NULL;

-- Spelling game: NULL when no spelling game has been completed.
UPDATE assignment_submissions s
SET spelling_game_best_score = NULL
FROM reading_sessions rs
WHERE s.student_session_id = rs.id
  AND COALESCE(rs.spelling_games_completed, 0) = 0
  AND s.spelling_game_best_score IS NOT NULL;

-- Grammar quiz: NULL when the grammar quiz has not been completed.
UPDATE assignment_submissions s
SET grammar_quiz_score = NULL
FROM reading_sessions rs
WHERE s.student_session_id = rs.id
  AND COALESCE(rs.grammar_quiz_completed, false) = false
  AND s.grammar_quiz_score IS NOT NULL;

-- Grammar games (best score + accuracy): NULL when no grammar game completed.
UPDATE assignment_submissions s
SET grammar_game_best_score = NULL,
    grammar_game_accuracy = NULL
FROM reading_sessions rs
WHERE s.student_session_id = rs.id
  AND COALESCE(rs.grammar_games_completed, 0) = 0
  AND (s.grammar_game_best_score IS NOT NULL OR s.grammar_game_accuracy IS NOT NULL);

COMMIT;

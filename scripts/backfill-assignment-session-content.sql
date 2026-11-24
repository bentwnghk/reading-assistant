-- Backfill teacher-prepared content into existing students' assignment
-- working copies.
--
-- insertStudentAssignmentSession (src/lib/assignments.ts) forked the session
-- INSERT from createReadingSession and drifted: it never wrote pre_reading,
-- pre_reading_generated_at, collocations, collocations_generated_at,
-- vocabulary_quiz or generated_text_meta. Every assignment copy created
-- before that fix therefore silently lacked the teacher's pre-reading
-- scaffolding and collocations, and the roster Progress column under-counted
-- (calculateProgress steps "pre-reading" and "collocations" could never be
-- true), which is why never-viewed students showed e.g. 33% while the
-- teacher's own session and the Avg progress tagline showed 40%.
--
-- This migration restores the missing CONTENT from the frozen assignment
-- snapshot (assignments.source_session_snapshot, camelCase ReadingStore
-- shape). Guards keep anything the student authored:
--   - pre_reading/generated_text_meta: only where still NULL
--   - collocations/vocabulary_quiz: only where NULL or empty ('[]')
--   - the teacher's per-item quiz answers are stripped (userAnswer /
--     earnedPoints) exactly like stripSessionForAssignment now does
--   - grammar_quiz items are answer-stripped only on copies the student
--     never started (same predicate as UNSTARTED_SESSION_SQL) — started
--     copies already hold the student's own answers.
--
-- assignment_submissions.progress is NOT recomputed here: the app re-syncs it
-- from the live session rows (syncAssignmentProgressCache in
-- src/lib/assignments.ts) the next time the assignment is opened, so the
-- roster rows, the Avg progress tagline and the assignment-list cards
-- converge without duplicating the 15-step progress helper in SQL.

-- 1) Pre-reading scaffolding (content kept by the strip, never persisted)
UPDATE reading_sessions r
SET pre_reading = a.source_session_snapshot->'preReading',
    pre_reading_generated_at =
      COALESCE((a.source_session_snapshot->>'preReadingGeneratedAt')::bigint, 0)
FROM assignments a
WHERE r.assignment_id = a.id
  AND r.source = 'assignment'
  AND r.pre_reading IS NULL
  AND a.source_session_snapshot->'preReading' IS NOT NULL;

-- 2) Collocations (same drift; restore only when the copy has none of its own)
UPDATE reading_sessions r
SET collocations = a.source_session_snapshot->'collocations',
    collocations_generated_at =
      COALESCE((a.source_session_snapshot->>'collocationsGeneratedAt')::bigint, 0)
FROM assignments a
WHERE r.assignment_id = a.id
  AND r.source = 'assignment'
  AND (r.collocations IS NULL OR r.collocations = '[]'::jsonb)
  AND COALESCE(a.source_session_snapshot->'collocations', '[]'::jsonb) <> '[]'::jsonb;

-- 3) Vocabulary quiz questions (content; per-item teacher answers stripped)
UPDATE reading_sessions r
SET vocabulary_quiz = (
      SELECT COALESCE(jsonb_agg(item - 'userAnswer'), '[]'::jsonb)
      FROM jsonb_array_elements(a.source_session_snapshot->'vocabularyQuiz') AS t(item)
    )
FROM assignments a
WHERE r.assignment_id = a.id
  AND r.source = 'assignment'
  AND (r.vocabulary_quiz IS NULL OR r.vocabulary_quiz = '[]'::jsonb)
  AND COALESCE(a.source_session_snapshot->'vocabularyQuiz', '[]'::jsonb) <> '[]'::jsonb;

-- 4) Generated-text metadata
UPDATE reading_sessions r
SET generated_text_meta = a.source_session_snapshot->'generatedTextMeta'
FROM assignments a
WHERE r.assignment_id = a.id
  AND r.source = 'assignment'
  AND r.generated_text_meta IS NULL
  AND a.source_session_snapshot->'generatedTextMeta' IS NOT NULL;

-- 5) Strip the teacher's per-item answers from grammar-quiz items on copies
--    the student never touched (created before the strip fixed this). Started
--    copies hold the student's own answers and are left alone. (The cleaned
--    array is precomputed over a self-snapshot — a SET subquery may not
--    reference the UPDATE target.)
UPDATE reading_sessions r
SET grammar_quiz = cleaned.items
FROM assignments a,
     assignment_submissions s,
     (
       SELECT rs.id,
              COALESCE(jsonb_agg(item - 'userAnswer' - 'earnedPoints'), '[]'::jsonb) AS items
       FROM reading_sessions rs
       CROSS JOIN LATERAL jsonb_array_elements(rs.grammar_quiz) AS t(item)
       GROUP BY rs.id
     ) cleaned
WHERE cleaned.id = r.id
  AND s.student_session_id = r.id
  AND r.assignment_id = a.id
  AND r.source = 'assignment'
  AND s.last_viewed_at IS NULL
  AND s.submitted_at IS NULL
  AND COALESCE(r.student_prediction, '') = ''
  AND COALESCE(r.test_completed, FALSE) = FALSE
  AND COALESCE(r.tests_completed, 0) = 0
  AND COALESCE(r.vocab_quizzes_completed, 0) = 0
  AND COALESCE(r.spelling_games_completed, 0) = 0
  AND COALESCE(r.grammar_quizzes_completed, 0) = 0
  AND COALESCE(r.grammar_games_completed, 0) = 0
  AND COALESCE(r.chat_history, '[]'::jsonb) = '[]'::jsonb
  AND COALESCE(r.glossary_ratings, '{}'::jsonb) = '{}'::jsonb;

-- 6) Sanitize the frozen assignment snapshots themselves: they were created
--    before stripSessionForAssignment stripped per-item quiz answers, and
--    updateAssignmentRoster re-uses the stored snapshot for students added
--    later. Only touches existing non-empty arrays.
UPDATE assignments a
SET source_session_snapshot = jsonb_set(a.source_session_snapshot, '{vocabularyQuiz}', cleaned.items)
FROM (
  SELECT asg.id,
         COALESCE(jsonb_agg(item - 'userAnswer'), '[]'::jsonb) AS items
  FROM assignments asg
  CROSS JOIN LATERAL jsonb_array_elements(asg.source_session_snapshot->'vocabularyQuiz') AS t(item)
  GROUP BY asg.id
) cleaned
WHERE cleaned.id = a.id
  AND jsonb_typeof(a.source_session_snapshot->'vocabularyQuiz') = 'array'
  AND a.source_session_snapshot->'vocabularyQuiz' <> '[]'::jsonb;

UPDATE assignments a
SET source_session_snapshot = jsonb_set(a.source_session_snapshot, '{grammarQuiz}', cleaned.items)
FROM (
  SELECT asg.id,
         COALESCE(jsonb_agg(item - 'userAnswer' - 'earnedPoints'), '[]'::jsonb) AS items
  FROM assignments asg
  CROSS JOIN LATERAL jsonb_array_elements(asg.source_session_snapshot->'grammarQuiz') AS t(item)
  GROUP BY asg.id
) cleaned
WHERE cleaned.id = a.id
  AND jsonb_typeof(a.source_session_snapshot->'grammarQuiz') = 'array'
  AND a.source_session_snapshot->'grammarQuiz' <> '[]'::jsonb;


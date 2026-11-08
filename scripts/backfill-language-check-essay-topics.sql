-- ─── Data backfill: associate pre-Topic-Library essays with a writing topic ──
--
-- Essays checked/assessed BEFORE the Topic Library shipped (v7.53) carry no
-- writing-task snapshot: topic_id IS NULL and topic/essay_type/question_image
-- are '' (the defaults from add-language-check-topics.sql). Those essays can
-- never appear in the staff Student-essays table under a topic filter (the
-- filter is `e.topic_id = ...` in listStaffEssays) and their "Check again" /
-- assessment runs without writing-task context (taskOf() in
-- useLanguageCheck.ts / EssayTaskCard).
--
-- This migration links every never-associated essay whose TRANSCRIPT or TITLE
-- contains any of the keywords below to the saved topic titled
-- "2026-27 S6 Writing 2", copying the topic snapshot (title, essay type,
-- question image) onto the essay exactly as createEssay() does on a real
-- upload — so the essays are groupable/filterable by the topic AND re-checks
-- gain the writing-task context. It also RETITLES each linked essay to the
-- topic title — the same default a real upload gets — so the Title column in
-- the staff Student-essays table shows the task. NOTE: the old AI-generated
-- titles are overwritten and not recoverable after the commit.
--
-- Keyword matching is whitespace-tolerant (`\s+` between words): OCR line
-- breaks often split a phrase mid-way ("social⏎media") and a literal-space
-- LIKE would silently miss those essays.
--
-- Step 3 retro-titles essays that an EARLIER run of this script (before the
-- retitle step existed) already linked — step 2's never-associated guard
-- skips them forever, so re-running this file after such a run is exactly
-- what applies the new titles to them.
--
-- Guards:
--   * Only essays with topic_id IS NULL AND topic = '' are touched. Uploads
--     since v7.53 always pick a topic, and deleting a library topic keeps the
--     snapshot text (ON DELETE SET NULL) — both are never re-linked, so an
--     essay already on another topic cannot be hijacked.
--   * Aborts (rolls back) if no topic titled "2026-27 S6 Writing 2" exists.
--     If SEVERAL topics share the title it proceeds with the MOST RECENTLY
--     CREATED one and lists all candidates as WARNING/NOTICEs — verify the
--     chosen id before trusting the result.
--   * updated_at is PRESERVED: language_check_essays carries a BEFORE UPDATE
--     trigger (update_updated_at_column) that would otherwise stamp every
--     backfilled row with NOW() and reshuffle every recency-sorted list
--     (staff table default sort, student essay list). The trigger is disabled
--     only inside this transaction, so any failure rolls back everything,
--     including the disable.
--
-- Safe to re-run: step 2 skips already-linked essays, step 3 skips titles
-- that already match the topic title.
-- Prerequisite: add-language-check-topics.sql (+ add-language-check-topic-class.sql).
-- Run with ON_ERROR_STOP so a failure stops the script immediately:
--   psql -v ON_ERROR_STOP=1 -f scripts/backfill-language-check-essay-topics.sql

BEGIN;

-- 1 ─ Validate the target topic exists; surface same-title duplicates. -------
DO $$
DECLARE
  n integer;
  t record;
BEGIN
  SELECT COUNT(*) INTO n
  FROM language_check_topics
  WHERE title = '2026-27 S6 Writing 2';

  IF n = 0 THEN
    RAISE EXCEPTION
      'Backfill aborted: no writing topic titled "2026-27 S6 Writing 2" exists in language_check_topics. Create it (or check the title spelling) and re-run.';
  END IF;

  IF n > 1 THEN
    RAISE WARNING
      '% writing topics share the title "2026-27 S6 Writing 2"; essays will be linked to the MOST RECENTLY CREATED one. Candidates:',
      n;
    FOR t IN
      SELECT id, user_id, class_id, created_at
      FROM language_check_topics
      WHERE title = '2026-27 S6 Writing 2'
      ORDER BY created_at DESC, id
    LOOP
      RAISE NOTICE
        '  candidate topic % (creator %, class %, created %)',
        t.id, t.user_id, t.class_id, t.created_at;
    END LOOP;
  END IF;
END
$$;

-- 2 ─ Link keyword-matching, never-associated essays to the topic. -----------
ALTER TABLE language_check_essays
  DISABLE TRIGGER update_language_check_essays_updated_at;

UPDATE language_check_essays e
SET title          = t.title,
    topic_id       = t.id,
    topic          = t.title,
    essay_type     = t.essay_type,
    question_image = t.question_image
FROM (
  -- Deterministic pick when duplicate titles exist (see the DO block above).
  SELECT id, title, essay_type, question_image
  FROM language_check_topics
  WHERE title = '2026-27 S6 Writing 2'
  ORDER BY created_at DESC, id
  LIMIT 1
) t
WHERE e.topic_id IS NULL
  AND e.topic = ''
  AND (
        e.transcript ~* '(social\s+media|traditional\s+media|advertisement|this\s+day\s+and\s+age)'
     OR e.title      ~* '(social\s+media|traditional\s+media|advertisement|this\s+day\s+and\s+age)'
      );

-- 3 ─ Retro-title essays an EARLIER run of this script already linked. --------
-- Runs before the retitle step existed set topic_id/topic/essay_type/
-- question_image but left the old AI-generated title in place. Their titles
-- were never rewritten, so the same keyword match still finds them; only
-- `title` is touched (topic/essay_type/question_image are already correct).
-- The title <> t.title check makes correct titles a no-op — re-runs and
-- post-v7.53 uploads (whose default title already IS the topic title) are
-- left alone; a manually customised title on a keyword essay IS retitled
-- (that is the point of this step).
UPDATE language_check_essays e
SET title = t.title
FROM language_check_topics t
WHERE t.title = '2026-27 S6 Writing 2'
  AND e.topic_id = t.id
  AND e.title <> t.title
  AND (
        e.transcript ~* '(social\s+media|traditional\s+media|advertisement|this\s+day\s+and\s+age)'
     OR e.title      ~* '(social\s+media|traditional\s+media|advertisement|this\s+day\s+and\s+age)'
      );

ALTER TABLE language_check_essays
  ENABLE TRIGGER update_language_check_essays_updated_at;

COMMIT;

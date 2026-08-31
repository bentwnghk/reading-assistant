-- Fix review-session History badges showing "New" for mastered words.
--
-- Main-page glossary games and spelling battles recorded review sessions
-- with a client-side placeholder masteryAfter = 0 (the clients had no
-- mastery state for those words). The server now enriches masteryAfter from
-- user_vocabulary when a review session is created; this script repairs the
-- rows recorded before that fix.
--
-- For each affected row, mastery_after is set to the word's CURRENT level in
-- user_vocabulary — the closest available approximation of the post-review
-- level (exact for words whose level has not changed since that session).
-- Rows are only touched when the word currently sits above level 0, so
-- genuinely-new words keep showing "New".
--
-- The completed_at cutoff limits the repair to sessions recorded while the
-- buggy clients were live, so that older sessions where a word was genuinely
-- new (and only later mastered) are not rewritten:
--   1787270400000 = 2026-08-21 00:00 UTC (v4.09 reworked spelling games)
--   1785110400000 = 2026-07-27 00:00 UTC (v2.923 first hardcoded recording)
-- Lower the threshold to 1785110400000 if main-page games were played
-- between those dates.

UPDATE vocabulary_review_results vrr
SET mastery_after = uv.mastery_level
FROM vocabulary_review_sessions vrs,
     user_vocabulary uv
WHERE vrr.session_id = vrs.id
  AND vrs.user_id = uv.user_id
  AND lower(vrr.word) = uv.word
  AND vrr.mastery_after = 0
  AND uv.mastery_level > 0
  AND vrs.completed_at >= 1787270400000;

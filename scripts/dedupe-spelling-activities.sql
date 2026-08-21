-- One-off data cleanup for the solo spelling completion-effect loop
-- (React error #185). The unguarded completion effect in
-- VocabularySpelling.tsx re-fired logActivity("spelling_complete") and
-- logActivity("spelling_hot_streak") on every parent re-render, inserting
-- many identical rows for a single game and inflating:
--   1. activity_logs                (duplicate rows)
--   2. user_achievements            (wrongly-unlocked spelling milestones)
--   3. weekly_stats / all_time_stats (cached spelling_games_completed)
--
-- Requires: add-leaderboard.sql, add-achievements.sql,
-- add-spelling-achievements.sql, add-all-time-leaderboard.sql.
-- Idempotent: safe to run multiple times. No schema changes.
-- Known limitation: the per-session spellingGamesCompleted counter inside
-- each reading session's JSON (reading_sessions store sync) was also
-- incremented per loop iteration, but that value is client-owned and gets
-- overwritten by the client store on the next session save — it cannot be
-- corrected from SQL.

BEGIN;

-- ─── 1. Delete duplicate activity rows ──────────────────────────────────────
-- The loop re-POSTed the SAME payload within seconds. A row is a duplicate
-- when it is identical (user, type, session, score, accuracy, details) to the
-- previous row of its partition AND was inserted within 60 seconds of it.
-- Legit back-to-back games cannot match on every payload field within 60s
-- (a game takes minutes), so no real play is ever removed. NULLs (e.g.
-- session_id for /vocabulary page games) group together in PARTITION BY.
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER w AS rn,
         created_at - LAG(created_at) OVER w AS gap
  FROM activity_logs
  WHERE activity_type IN ('spelling_complete', 'spelling_hot_streak')
  WINDOW w AS (
    PARTITION BY user_id, activity_type, session_id, score, accuracy, details
    ORDER BY created_at ASC
  )
)
DELETE FROM activity_logs
WHERE id IN (
  SELECT id FROM ordered WHERE rn > 1 AND gap < INTERVAL '60 seconds'
);

-- ─── 2. Remove wrongly-unlocked achievement milestones ──────────────────────
-- Mirrors checkAndUnlockAchievements (src/lib/achievements.ts): a milestone
-- is only valid when the deduplicated activity count reaches its target.
-- This also restores the unlock dialog for milestones users will legitimately
-- reach later (stale rows suppressed the "newly unlocked" detection).
-- Milestones for other achievement types are untouched.
DELETE FROM user_achievements ua
WHERE ua.achievement_type IN ('spelling_challenges', 'spelling_hot_streak')
  AND ua.milestone > (
    SELECT COUNT(*)
    FROM activity_logs a
    WHERE a.user_id = ua.user_id
      AND a.activity_type = (
        CASE ua.achievement_type
          WHEN 'spelling_challenges' THEN 'spelling_complete'
          ELSE 'spelling_hot_streak'
        END
      )
  );

-- ─── 3. Rebuild cached leaderboard spelling counts ──────────────────────────
-- AVG score/accuracy are unchanged by the dedupe (every duplicate carried
-- identical values, so the mean is the same); only the COUNT was inflated.
-- weekly_score / all_time_score do not use the spelling count and are
-- recomputed on the next POST /api/leaderboard/refresh regardless.
-- date_trunc('week', created_at AT TIME ZONE 'UTC') matches getWeekStart()
-- (Monday 00:00 UTC) regardless of the server's TimeZone setting.
UPDATE weekly_stats ws
SET spelling_games_completed = sub.cnt
FROM (
  SELECT user_id,
         date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
         COUNT(*)::int AS cnt
  FROM activity_logs
  WHERE activity_type = 'spelling_complete'
  GROUP BY user_id, week_start
) sub
WHERE ws.user_id = sub.user_id
  AND ws.week_start_date = sub.week_start;

UPDATE all_time_stats ats
SET spelling_games_completed = sub.cnt
FROM (
  SELECT user_id, COUNT(*)::int AS cnt
  FROM activity_logs
  WHERE activity_type = 'spelling_complete'
  GROUP BY user_id
) sub
WHERE ats.user_id = sub.user_id;

COMMIT;

-- ─── Optional post-checks ───────────────────────────────────────────────────
-- Remaining spelling activity rows (one per real game):
--   SELECT activity_type, COUNT(*) FROM activity_logs
--    WHERE activity_type IN ('spelling_complete', 'spelling_hot_streak')
--    GROUP BY activity_type;
--
-- Remaining spelling milestones (each must be <= the counts above per user):
--   SELECT achievement_type, user_id, milestone FROM user_achievements
--    WHERE achievement_type IN ('spelling_challenges', 'spelling_hot_streak')
--    ORDER BY achievement_type, user_id, milestone;

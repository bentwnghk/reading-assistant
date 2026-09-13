-- ─── Spelling challenge drill-down details ──────────────────────────────────
-- Stores the per-word results (word, typed answer, correctness, per-word
-- game mode) of a session's MOST RECENT spelling game — solo or multiplayer
-- battle. Mirrors the vocabulary_quiz JSONB pattern: the teacher Student
-- Data / Teacher Data tables fetch it on demand via
-- /api/sessions/[id]/detail to render the drill-down dialog behind the
-- spelling score / accuracy badges.
--
-- Like vocabulary_quiz, the array reflects the latest game, while the
-- spelling_game_best_score badge shows the best across games. Sessions
-- created before this migration simply have no details to show (empty
-- dialog state).
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS spelling_results JSONB DEFAULT '[]'::jsonb;

-- ─── Grammar game drill-down details ────────────────────────────────────────
-- Stores the per-round results (game, question, user answer, correct answer,
-- correctness) of a session's MOST RECENT grammar game — any of the five
-- (roulette / surgery / workshop / duel / scramble). Mirrors the
-- spelling_results pattern: the teacher Student Data / Teacher Data tables
-- fetch it on demand via /api/sessions/[id]/detail to render the drill-down
-- dialog behind the grammar game score / accuracy badges.
--
-- Like spelling_results, the array reflects the latest game, while the
-- grammar_game_best_score badge shows the best across games. Sessions created
-- before this migration simply have no details to show (empty dialog state).
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_results JSONB DEFAULT '[]'::jsonb;

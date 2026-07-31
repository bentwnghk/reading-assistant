-- All-time leaderboard stats (one row per user).
-- Mirrors the weekly_stats pattern but aggregates across ALL time (no week_start_date).
-- Refreshed lazily on each activity log (see src/app/api/activity/route.ts) and via
-- /api/leaderboard/refresh, exactly like weekly_stats.
--
-- Applies to: /leaderboard page "All-Time" period view.

CREATE TABLE IF NOT EXISTS all_time_stats (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_sessions            INTEGER      DEFAULT 0,
  longest_streak_days       INTEGER      DEFAULT 0,
  avg_test_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  total_flashcard_reviews   INTEGER       DEFAULT 0,
  avg_quiz_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_spelling_score        NUMERIC(10,2) DEFAULT 0,  -- raw game points, unbounded
  avg_spelling_accuracy     NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_quiz_score    NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_game_score    NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_game_accuracy NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  total_vocabulary_words    INTEGER       DEFAULT 0,  -- deduped count from user_vocabulary
  tests_completed           INTEGER       DEFAULT 0,
  quizzes_completed         INTEGER       DEFAULT 0,
  spelling_games_completed  INTEGER       DEFAULT 0,
  grammar_quizzes_completed INTEGER       DEFAULT 0,
  grammar_games_completed   INTEGER       DEFAULT 0,
  all_time_score            NUMERIC(12,2) DEFAULT 0,  -- composite score, unbounded
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ranking index (default sort is all_time_score DESC).
CREATE INDEX IF NOT EXISTS idx_all_time_stats_score
  ON all_time_stats (all_time_score DESC);
CREATE INDEX IF NOT EXISTS idx_all_time_stats_vocabulary
  ON all_time_stats (total_vocabulary_words DESC);
CREATE INDEX IF NOT EXISTS idx_all_time_stats_flashcards
  ON all_time_stats (total_flashcard_reviews DESC);

-- created_at/updated_at maintenance trigger (function defined in init-db.sql).
CREATE TRIGGER update_all_time_stats_updated_at
  BEFORE UPDATE ON all_time_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

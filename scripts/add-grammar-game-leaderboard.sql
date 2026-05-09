-- Add grammar game score columns to weekly_stats for leaderboard ranking
ALTER TABLE weekly_stats
  ADD COLUMN IF NOT EXISTS avg_grammar_game_score    NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_games_completed   INTEGER      DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_weekly_stats_grammar_game
  ON weekly_stats (week_start_date DESC, avg_grammar_game_score DESC);

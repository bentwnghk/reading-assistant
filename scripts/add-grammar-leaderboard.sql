-- Add grammar quiz score column to weekly_stats for leaderboard ranking
ALTER TABLE weekly_stats
  ADD COLUMN IF NOT EXISTS avg_grammar_quiz_score    NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_quizzes_completed INTEGER      DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_weekly_stats_grammar_quiz
  ON weekly_stats (week_start_date DESC, avg_grammar_quiz_score DESC);

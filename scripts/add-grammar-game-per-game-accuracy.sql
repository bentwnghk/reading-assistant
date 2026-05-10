-- Add per-game accuracy and completion count columns for cumulative average tracking
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_scramble_accuracy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_workshop_accuracy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_surgery_accuracy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_roulette_accuracy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_duel_accuracy INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_scramble_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_workshop_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_surgery_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_roulette_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_duel_completed INTEGER DEFAULT 0;

-- Add avg grammar game accuracy column to weekly_stats
ALTER TABLE weekly_stats
  ADD COLUMN IF NOT EXISTS avg_grammar_game_accuracy NUMERIC(6,2) DEFAULT 0;

-- Add accuracy column to activity_logs
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS accuracy INTEGER;

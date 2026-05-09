-- Add grammar game accuracy column to reading_sessions
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_game_accuracy INTEGER DEFAULT 0;

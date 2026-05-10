-- Add grammar game completed at timestamp to reading_sessions
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_game_completed_at TIMESTAMP WITH TIME ZONE;

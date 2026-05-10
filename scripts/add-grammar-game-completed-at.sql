-- Add completion counters and grammar game timestamp to reading_sessions
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS tests_completed INTEGER DEFAULT 0;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS vocab_quizzes_completed INTEGER DEFAULT 0;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS spelling_games_completed INTEGER DEFAULT 0;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_quizzes_completed INTEGER DEFAULT 0;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_games_completed INTEGER DEFAULT 0;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_game_completed_at TIMESTAMP WITH TIME ZONE;

-- Add avg spelling accuracy column to weekly_stats
-- Mirrors avg_grammar_game_accuracy: a 0–100 running average of spelling game accuracy
-- The activity_logs.accuracy column (added by add-grammar-game-per-game-accuracy.sql) is reused
-- for spelling_complete activities now that VocabularySpelling.tsx logs accuracy.

ALTER TABLE weekly_stats
  ADD COLUMN IF NOT EXISTS avg_spelling_accuracy NUMERIC(6,2) DEFAULT 0;

-- Add spelling game accuracy column to reading_sessions and assignment_submissions.
-- Mirrors grammar_game_accuracy: a 0–100 running average of correctCount/total
-- per completed spelling game. Distinct from the unbounded spelling_game_best_score
-- (cumulative points), this enables percentage-based performance analysis.
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS spelling_game_accuracy INTEGER DEFAULT 0;

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS spelling_game_accuracy INTEGER;

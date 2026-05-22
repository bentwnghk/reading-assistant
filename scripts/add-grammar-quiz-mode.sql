-- Add grammar_quiz_mode column to reading_sessions
-- This stores the quiz navigation mode: 'all-at-once' or 'question-by-question'
ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS grammar_quiz_mode TEXT NOT NULL DEFAULT 'all-at-once';

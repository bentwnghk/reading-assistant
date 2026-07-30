-- Add vocabulary_quiz JSONB column to store quiz questions and user answers
ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS vocabulary_quiz JSONB DEFAULT '[]';

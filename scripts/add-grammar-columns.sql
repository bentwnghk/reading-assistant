-- Add grammar analysis columns to reading_sessions table
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_topics JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grammar_quiz JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grammar_quiz_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_quiz_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grammar_quiz_earned_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_quiz_total_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_generated_at BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_quiz_completed_at BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_highlight_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grammar_highlight_topic_id TEXT DEFAULT NULL;

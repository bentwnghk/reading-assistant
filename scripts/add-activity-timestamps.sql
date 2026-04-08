-- Add per-activity completion timestamps to reading_sessions.
-- These replace flashcard_review_count and power the activity-date bucketing
-- in the Dashboard's Daily Learning Activity chart.

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS flashcard_review_dates    JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS summary_generated_at      BIGINT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mind_map_generated_at     BIGINT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adapted_text_generated_at BIGINT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simplified_text_generated_at BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS glossary_generated_at     BIGINT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spelling_game_completed_at BIGINT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vocab_quiz_completed_at   BIGINT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reading_test_completed_at BIGINT   DEFAULT 0;

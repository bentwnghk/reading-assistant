-- Add visualization_image column to reading_sessions
ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS visualization_image TEXT DEFAULT '';

ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS visualization_generated_at BIGINT DEFAULT 0;

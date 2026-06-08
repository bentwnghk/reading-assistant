-- Migration: Add source column to reading_sessions for tracking upload vs repository vs shared origin
ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'repository';
ALTER TABLE reading_sessions ADD CONSTRAINT reading_sessions_source_check CHECK (source IN ('upload', 'repository', 'shared'));

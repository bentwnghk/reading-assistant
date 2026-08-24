-- Add mind_map_language column to reading_sessions
-- Tracks the language ('en' | 'zh') the current mind_map was generated in,
-- so "Regenerate" in the SAME language re-analyzes the text (full generation
-- prompt) while switching languages translates the existing structure.
-- NULL = unknown (legacy maps) — the client falls back to fresh generation.
ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS mind_map_language TEXT DEFAULT NULL;

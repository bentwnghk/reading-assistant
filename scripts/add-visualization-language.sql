-- Add visualization_language column to reading_sessions
-- Tracks the language ('en' | 'zh') the current visualization_image was
-- generated in, so "Regenerate" in the SAME language composes a fresh image
-- (image omitted from the request) while switching languages performs an
-- image-to-image translation edit (image sent along).
-- NULL = unknown (legacy images) — the client falls back to fresh generation.
ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS visualization_language TEXT DEFAULT NULL;

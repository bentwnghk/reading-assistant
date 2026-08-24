-- Add summary_language column to reading_sessions
-- Tracks the language ('en' | 'zh') the current summary was generated in,
-- so "Regenerate" in the SAME language produces a fresh summary from the
-- text while switching languages translates the existing one.
-- NULL = unknown (legacy summaries) — the client falls back to fresh generation.
ALTER TABLE reading_sessions
ADD COLUMN IF NOT EXISTS summary_language TEXT DEFAULT NULL;

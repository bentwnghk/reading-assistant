-- ─── Add srs_counts to user_vocabulary ──────────────────────────────────────
-- Stores cumulative SRS button press counts per word for derived rating.
-- Safe to re-run.

ALTER TABLE user_vocabulary
  ADD COLUMN IF NOT EXISTS srs_counts JSONB NOT NULL DEFAULT '{"hard":0,"medium":0,"easy":0}'::jsonb;

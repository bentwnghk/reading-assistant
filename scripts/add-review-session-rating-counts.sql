-- ─── Add rating_counts to vocabulary_review_sessions ────────────────────────
-- Stores per-rating counts ({again, hard, good, easy}) for flashcard mode.
-- Adds optional 'rating' column to vocabulary_review_results for per-word SRS action.
-- Safe to re-run (uses IF NOT EXISTS / ADD IF NOT EXISTS where possible).

ALTER TABLE vocabulary_review_sessions
  ADD COLUMN IF NOT EXISTS rating_counts JSONB;

ALTER TABLE vocabulary_review_results
  ADD COLUMN IF NOT EXISTS rating TEXT;

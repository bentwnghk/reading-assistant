-- Collocation / Phrases feature (v2.x) — Option B (shared table, type-scoped).
-- Adds chunk-level collocations to reading sessions, and an entry_type
-- discriminator on the vocabulary layer so phrases get their own review queue.

-- Per-session AI-extracted collocations (content; kept on share).
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS collocations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collocations_generated_at BIGINT DEFAULT 0;

-- entry_type on user_vocabulary: 'word' (default) | 'phrase'.
-- The "Phrases" tab filters by entry_type = 'phrase'; review sessions are
-- type-scoped so phrases get their own queue. Existing rows backfill to 'word'.
ALTER TABLE user_vocabulary
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'word'
    CHECK (entry_type IN ('word', 'phrase'));

-- Scope review-session history by entry type.
ALTER TABLE vocabulary_review_sessions
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'word';

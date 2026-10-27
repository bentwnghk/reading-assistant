-- ─── Word-only lookup index on user_vocabulary ─────────────────────────────
-- All existing indexes on user_vocabulary lead with user_id, so queries that
-- filter by word alone (vocabulary analytics hard-word definition resolution,
-- any future cross-student word lookup) cannot use them and fall back to a
-- full scan. This index makes those lookups index-driven.
-- Safe to re-run.

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_word_lookup ON user_vocabulary(word);

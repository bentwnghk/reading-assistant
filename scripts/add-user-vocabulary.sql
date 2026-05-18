-- ─── User Vocabulary table ──────────────────────────────────────────────────
-- Stores aggregated vocabulary words from all reading sessions for the /vocabulary page.
-- Enables SRS tracking, cross-session review history, and efficient querying.

CREATE TABLE user_vocabulary (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  syllabification TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT '',
  english_definition TEXT DEFAULT '',
  chinese_definition TEXT DEFAULT '',
  example TEXT DEFAULT '',
  rating TEXT DEFAULT NULL CHECK (rating IS NULL OR rating IN ('easy', 'medium', 'hard')),
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at BIGINT NOT NULL DEFAULT 0,
  next_review_at BIGINT NOT NULL DEFAULT 0,
  source_session_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, word)
);

CREATE INDEX idx_user_vocabulary_user_id ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocabulary_next_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX idx_user_vocabulary_rating ON user_vocabulary(user_id, rating);
CREATE INDEX idx_user_vocabulary_mastery ON user_vocabulary(user_id, mastery_level);
CREATE INDEX idx_user_vocabulary_word ON user_vocabulary(user_id, word);

-- ─── Backfill user_vocabulary from existing reading_sessions ─────────────────
-- Extract glossary entries from all existing sessions and insert unique words.
-- Run once after creating the table.

INSERT INTO user_vocabulary (user_id, word, syllabification, part_of_speech, english_definition, chinese_definition, example, rating, source_session_ids, created_at, updated_at)
SELECT
  rs.user_id,
  lower(g.word) AS word,
  COALESCE(g.syllabification, '') AS syllabification,
  COALESCE(g.part_of_speech, '') AS part_of_speech,
  COALESCE(g.english_definition, '') AS english_definition,
  COALESCE(g.chinese_definition, '') AS chinese_definition,
  COALESCE(g.example, '') AS example,
  NULL AS rating,
  jsonb_build_array(rs.id) AS source_session_ids,
  COALESCE(EXTRACT(EPOCH FROM rs.created_at)::bigint * 1000, 0) AS created_at,
  COALESCE(EXTRACT(EPOCH FROM rs.updated_at)::bigint * 1000, 0) AS updated_at
FROM reading_sessions rs
CROSS JOIN LATERAL jsonb_array_elements(rs.glossary) AS g
WHERE rs.glossary IS NOT NULL
  AND jsonb_array_length(rs.glossary) > 0
ON CONFLICT (user_id, word) DO UPDATE SET
  syllabification = COALESCE(NULLIF(EXCLUDED.syllabification, ''), user_vocabulary.syllabification),
  part_of_speech = COALESCE(NULLIF(EXCLUDED.part_of_speech, ''), user_vocabulary.part_of_speech),
  english_definition = COALESCE(NULLIF(EXCLUDED.english_definition, ''), user_vocabulary.english_definition),
  chinese_definition = COALESCE(NULLIF(EXCLUDED.chinese_definition, ''), user_vocabulary.chinese_definition),
  example = COALESCE(NULLIF(EXCLUDED.example, ''), user_vocabulary.example),
  source_session_ids = (
    SELECT jsonb_agg(DISTinct elem)
    FROM jsonb_array_elements(user_vocabulary.source_session_ids || EXCLUDED.source_session_ids) elem
  ),
  updated_at = GREATEST(user_vocabulary.updated_at, EXCLUDED.updated_at);

-- Update ratings from glossary_ratings in sessions
UPDATE user_vocabulary uv
SET rating = r.rating_val
FROM (
  SELECT
    rs.user_id,
    lower(kv.key) AS word,
    kv.value::text AS rating_val
  FROM reading_sessions rs
  CROSS JOIN LATERAL jsonb_each_text(rs.glossary_ratings) AS kv(key, value)
  WHERE rs.glossary_ratings IS NOT NULL
    AND kv.value IN ('easy', 'medium', 'hard')
) r
WHERE uv.user_id = r.user_id
  AND uv.word = r.word
  AND (
    uv.rating IS NULL
    OR (uv.rating = 'easy' AND r.rating_val IN ('medium', 'hard'))
    OR (uv.rating = 'medium' AND r.rating_val = 'hard')
  );

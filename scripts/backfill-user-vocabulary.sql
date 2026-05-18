-- ─── Incremental migration: backfill user_vocabulary ─────────────────────────
-- Safe to re-run. Creates table/indexes only if missing. Deduplicates before insert.

CREATE TABLE IF NOT EXISTS user_vocabulary (
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

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user_id    ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_next_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_rating     ON user_vocabulary(user_id, rating);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_mastery    ON user_vocabulary(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_word       ON user_vocabulary(user_id, word);

-- Backfill: aggregate all glossary entries across sessions per user,
-- keeping the richest definition for each unique word, then insert
-- only words that do not already exist in user_vocabulary.
WITH extracted AS (
  SELECT
    rs.user_id,
    lower(g.obj->>'word') AS word,
    COALESCE(g.obj->>'syllabification', '') AS syllabification,
    COALESCE(g.obj->>'partOfSpeech', '') AS part_of_speech,
    COALESCE(g.obj->>'englishDefinition', '') AS english_definition,
    COALESCE(g.obj->>'chineseDefinition', '') AS chinese_definition,
    COALESCE(g.obj->>'example', '') AS example,
    rs.id AS session_id,
    COALESCE(EXTRACT(EPOCH FROM rs.created_at)::bigint * 1000, 0) AS created_at,
    COALESCE(EXTRACT(EPOCH FROM rs.updated_at)::bigint * 1000, 0) AS updated_at
  FROM reading_sessions rs
  CROSS JOIN LATERAL jsonb_array_elements(rs.glossary) AS g(obj)
  WHERE rs.glossary IS NOT NULL
    AND jsonb_array_length(rs.glossary) > 0
),
deduped AS (
  SELECT DISTINCT ON (user_id, word)
    user_id, word, syllabification, part_of_speech,
    english_definition, chinese_definition, example,
    created_at, updated_at
  FROM (
    SELECT *,
      -- prefer rows with longer definitions (richer content)
      LENGTH(english_definition) + LENGTH(chinese_definition) + LENGTH(example) AS richness
    FROM extracted
  ) sub
  ORDER BY user_id, word, richness DESC
),
session_ids AS (
  SELECT user_id, word, jsonb_agg(DISTINCT session_id) AS sids
  FROM extracted
  GROUP BY user_id, word
)
INSERT INTO user_vocabulary (user_id, word, syllabification, part_of_speech, english_definition, chinese_definition, example, source_session_ids, created_at, updated_at)
SELECT
  d.user_id, d.word, d.syllabification, d.part_of_speech,
  d.english_definition, d.chinese_definition, d.example,
  s.sids, d.created_at, d.updated_at
FROM deduped d
JOIN session_ids s ON s.user_id = d.user_id AND s.word = d.word
ON CONFLICT (user_id, word) DO UPDATE SET
  syllabification   = COALESCE(NULLIF(EXCLUDED.syllabification, ''),   user_vocabulary.syllabification),
  part_of_speech    = COALESCE(NULLIF(EXCLUDED.part_of_speech, ''),    user_vocabulary.part_of_speech),
  english_definition = COALESCE(NULLIF(EXCLUDED.english_definition, ''), user_vocabulary.english_definition),
  chinese_definition = COALESCE(NULLIF(EXCLUDED.chinese_definition, ''), user_vocabulary.chinese_definition),
  example           = COALESCE(NULLIF(EXCLUDED.example, ''),           user_vocabulary.example),
  source_session_ids = (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements(user_vocabulary.source_session_ids || EXCLUDED.source_session_ids) elem
  ),
  updated_at = GREATEST(user_vocabulary.updated_at, EXCLUDED.updated_at);

-- Update ratings from glossary_ratings in sessions (pick hardest rating)
UPDATE user_vocabulary uv
SET rating = r.rating_val
FROM (
  SELECT user_id, word, rating_val
  FROM (
    SELECT
      rs.user_id,
      lower(kv.key) AS word,
      kv.value::text AS rating_val,
      ROW_NUMBER() OVER (
        PARTITION BY rs.user_id, lower(kv.key)
        ORDER BY
          CASE kv.value::text
            WHEN 'hard' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'easy' THEN 1
          END DESC
      ) AS rn
    FROM reading_sessions rs
    CROSS JOIN LATERAL jsonb_each_text(rs.glossary_ratings) AS kv(key, value)
    WHERE rs.glossary_ratings IS NOT NULL
      AND kv.value IN ('easy', 'medium', 'hard')
  ) sub
  WHERE rn = 1
) r
WHERE uv.user_id = r.user_id
  AND uv.word = r.word
  AND (
    uv.rating IS NULL
    OR (uv.rating = 'easy'   AND r.rating_val IN ('medium', 'hard'))
    OR (uv.rating = 'medium' AND r.rating_val = 'hard')
  );

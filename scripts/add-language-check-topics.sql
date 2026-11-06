-- Grammar Check: Topic Library + per-essay writing-task snapshot.
--
-- A topic (title, full prompt, optional question image, DSE essay type) is
-- entered once and reused for every essay scanned for that task — essential
-- for teachers scanning a whole class's handwritten essays on one topic.
-- The library is personal to its creator.
--
-- Essays store a SNAPSHOT of the topic (not just the id) so editing or
-- deleting a library entry never changes how an already-checked essay was
-- assessed. Old essays keep the empty defaults (= no writing-task context).

CREATE TABLE IF NOT EXISTS language_check_topics (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  topic          TEXT NOT NULL,
  essay_type     TEXT NOT NULL CHECK (essay_type IN ('dse-part-a', 'dse-part-b')),
  -- Downscaled JPEG data URL of the question paper ('' = none). Excluded
  -- from the list query (lightweight/full split).
  question_image TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_language_check_topics_user
  ON language_check_topics(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_language_check_topics_updated_at ON language_check_topics;
CREATE TRIGGER update_language_check_topics_updated_at
    BEFORE UPDATE ON language_check_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE language_check_essays
  ADD COLUMN IF NOT EXISTS topic_id TEXT REFERENCES language_check_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS essay_type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS question_image TEXT NOT NULL DEFAULT '';

-- Language Check: handwritten/scanned essay error correction.
-- Independent of reading_sessions. images are downscaled JPEG data URLs and
-- are excluded from the list query (lightweight/full split).

CREATE TABLE IF NOT EXISTS language_check_essays (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  images        JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'transcribed', 'checked')),
  checked_text  TEXT NOT NULL DEFAULT '',
  corrections   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ocr_model     TEXT NOT NULL DEFAULT '',
  check_model   TEXT NOT NULL DEFAULT '',
  dropped_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_language_check_essays_user
  ON language_check_essays(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_language_check_essays_updated_at ON language_check_essays;
CREATE TRIGGER update_language_check_essays_updated_at
    BEFORE UPDATE ON language_check_essays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

GRANT ALL PRIVILEGES ON language_check_essays TO reading_user;

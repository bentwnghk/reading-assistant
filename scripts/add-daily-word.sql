-- Word of the Day (/vocabulary): per-user daily progress, AI page content and
-- generated illustrations, so streaks and pages sync across devices.

-- One row per user per calendar day (client-local YYYY-MM-DD). A row exists as
-- soon as the day's word is pinned; learned_at is set once the user marks it
-- learned. on_time = learned on that very day (only these extend the streak).
CREATE TABLE IF NOT EXISTS daily_word_progress (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_key    TEXT NOT NULL CHECK (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  word       TEXT NOT NULL,
  learned_at BIGINT,
  on_time    BOOLEAN NOT NULL DEFAULT FALSE,
  note       TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day_key)
);

-- AI-written calendar page per user + word (lower-cased key).
CREATE TABLE IF NOT EXISTS daily_word_content (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_key   TEXT NOT NULL,
  content    JSONB NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, word_key)
);

-- Generated illustrations (base64 data URLs), kept apart from the content row
-- so listing/reading content never drags megabytes of image data.
CREATE TABLE IF NOT EXISTS daily_word_images (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_key   TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('mascot', 'scene')),
  image      TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, word_key, kind)
);
CREATE INDEX IF NOT EXISTS idx_daily_word_images_user_created
  ON daily_word_images(user_id, created_at DESC);

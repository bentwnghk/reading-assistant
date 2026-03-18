-- Migration: Add text repository tables
-- Run this on existing databases that already have the base schema.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ guards).
--
-- Prerequisites: schools table must already exist (run add-schools.sql first
-- if you have not done so).

-- 1. Ensure the update_updated_at_column() function exists
--    (created by init-db.sql / add-schools.sql, but guard it here for safety).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Create text_repository table
CREATE TABLE IF NOT EXISTS text_repository (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  title        TEXT DEFAULT '',
  extracted_text TEXT NOT NULL,
  school_id    TEXT REFERENCES schools(id) ON DELETE SET NULL,
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_text_repository_school_id  ON text_repository(school_id);
CREATE INDEX IF NOT EXISTS idx_text_repository_is_public  ON text_repository(is_public);
CREATE INDEX IF NOT EXISTS idx_text_repository_created_by ON text_repository(created_by);
CREATE INDEX IF NOT EXISTS idx_text_repository_updated_at ON text_repository(updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_text_repository_updated_at'
  ) THEN
    CREATE TRIGGER update_text_repository_updated_at
      BEFORE UPDATE ON text_repository
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 3. Create text_repository_images table
CREATE TABLE IF NOT EXISTS text_repository_images (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id      TEXT NOT NULL REFERENCES text_repository(id) ON DELETE CASCADE,
  image_data   BYTEA NOT NULL,
  image_order  INTEGER NOT NULL DEFAULT 0,
  content_type TEXT DEFAULT 'image/png',
  file_size    INTEGER,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_repo_image_order UNIQUE (text_id, image_order)
);

CREATE INDEX IF NOT EXISTS idx_text_repository_images_text_id ON text_repository_images(text_id);

-- 4. Grant permissions (adjust role name if your setup uses a different role)
GRANT ALL PRIVILEGES ON TABLE text_repository        TO reading_user;
GRANT ALL PRIVILEGES ON TABLE text_repository_images TO reading_user;

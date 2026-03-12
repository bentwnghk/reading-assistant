-- Migration: Add schools entity and auto-assign users by email domain
-- Run this on existing databases that already have the base schema.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- 1. Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_domain ON schools(domain);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_schools_updated_at'
  ) THEN
    CREATE TRIGGER update_schools_updated_at
      BEFORE UPDATE ON schools
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2. Add school_id column to users (if not already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- 3. Back-fill: create a school for every distinct email domain already in the system
INSERT INTO schools (name, domain)
  SELECT DISTINCT
    SPLIT_PART(email, '@', 2) AS name,
    SPLIT_PART(email, '@', 2) AS domain
  FROM users
  WHERE email IS NOT NULL
    AND email LIKE '%@%'
    AND SPLIT_PART(email, '@', 2) <> ''
  ON CONFLICT (domain) DO NOTHING;

-- 4. Back-fill: assign each user to the school that matches their email domain
--    Only sets school_id where it is currently NULL (preserves any future manual overrides)
UPDATE users u
SET school_id = s.id
FROM schools s
WHERE SPLIT_PART(u.email, '@', 2) = s.domain
  AND u.email IS NOT NULL
  AND u.school_id IS NULL;

-- 5. Add school_id column to classes (if not already present)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- 6. Back-fill: assign each class to a school based on its teacher's school
--    Classes with no teacher remain unassigned (school_id = NULL).
UPDATE classes c
SET school_id = u.school_id
FROM users u
WHERE c.teacher_id = u.id
  AND u.school_id IS NOT NULL
  AND c.school_id IS NULL;

-- 7. Grant permissions (adjust role name if your setup differs)
GRANT ALL PRIVILEGES ON TABLE schools TO reading_user;

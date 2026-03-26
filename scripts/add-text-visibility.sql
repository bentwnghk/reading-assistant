-- Migration: Add visibility field to text_repository
-- This allows granular control over who can see texts:
-- - 'class': Only students in the creator's classes
-- - 'school': Everyone in the same school
-- - 'public': Everyone (all schools)

-- Add visibility column with default 'school' for backward compatibility
ALTER TABLE text_repository 
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'school'
CHECK (visibility IN ('class', 'school', 'public'));

-- Create index for visibility queries
CREATE INDEX IF NOT EXISTS idx_text_repository_visibility ON text_repository(visibility);

-- Migrate existing data: 
-- is_public = true -> visibility = 'public'
-- is_public = false -> visibility = 'school'
UPDATE text_repository 
SET visibility = CASE 
  WHEN is_public = true THEN 'public'
  ELSE 'school'
END
WHERE visibility = 'school' AND is_public = true;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE text_repository TO reading_user;

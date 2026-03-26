-- Migration: Add class_id to text_repository for class-specific visibility
-- When visibility = 'class' and class_id is set, text is only visible to that specific class
-- When visibility = 'class' and class_id is NULL, text is visible to all classes of the teacher

ALTER TABLE text_repository 
ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_text_repository_class_id ON text_repository(class_id);

GRANT ALL PRIVILEGES ON TABLE text_repository TO reading_user;

-- Migration: 'writing' reading-session source
-- Sessions loaded from a Writing Assessment enhanced essay (light/heavy) via
-- the Enhanced Essays tab's "use as reading text" action carry
-- source = 'writing'. Add the value to the reading_sessions source CHECK.
--
-- Apply after add-ai-generated-text.sql (the last migration that touched the
-- source CHECK constraint).

ALTER TABLE reading_sessions DROP CONSTRAINT IF EXISTS reading_sessions_source_check;
ALTER TABLE reading_sessions ADD CONSTRAINT reading_sessions_source_check
  CHECK (source IN ('upload', 'repository', 'shared', 'assignment', 'ai-generated', 'writing'));

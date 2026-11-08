-- Writing Assessment: class-assigned topics.
--
-- A topic may target ONE class (in addition to staying personal to its
-- creator). Visibility mirrors /api/classes: students see topics for the
-- classes they belong to, teachers for the classes they teach, admins for
-- the classes in their school, super-admins for every class. Only the
-- creator can edit/delete; everyone who can see a class topic may select
-- it when uploading an essay (it is snapshotted onto the essay like any
-- other topic).
--
-- Deleting the class detaches its topics (they become personal again)
-- rather than deleting work.

ALTER TABLE language_check_topics
  ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_language_check_topics_class
  ON language_check_topics(class_id) WHERE class_id IS NOT NULL;

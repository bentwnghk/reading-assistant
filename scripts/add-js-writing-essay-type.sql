-- Writing Assessment: add the "JS Writing" (Junior Secondary) essay type to
-- the Topic Library. Essays snapshot essay_type into an unconstrained TEXT
-- column, so only the topics table needs its CHECK constraint widened.

ALTER TABLE language_check_topics
  DROP CONSTRAINT IF EXISTS language_check_topics_essay_type_check;

ALTER TABLE language_check_topics
  ADD CONSTRAINT language_check_topics_essay_type_check
  CHECK (essay_type IN ('dse-part-a', 'dse-part-b', 'js-writing'));

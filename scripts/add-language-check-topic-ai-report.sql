-- Writing Assessment: AI assessment report per writing topic (staff).
--
-- One saved report per (topic, staff member): the report only reflects the
-- essays inside that staff member's scope. essay_count is the number of
-- checked essay rows the report was generated from (set server-side), so the
-- UI can tell when new submissions have arrived since.

CREATE TABLE IF NOT EXISTS language_check_topic_ai_reports (
  topic_id     TEXT NOT NULL REFERENCES language_check_topics(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report       JSONB NOT NULL,
  essay_count  INTEGER NOT NULL DEFAULT 0,
  model        TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (topic_id, user_id)
);

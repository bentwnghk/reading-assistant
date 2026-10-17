-- Language Check › "Learn from your mistakes": persisted learning sessions,
-- archived quiz rounds and an append-only activity ledger.
-- Independent of reading_sessions / activity_logs / achievements.
--
--   language_check_learn_sessions  full content (lesson, practice, quiz) and
--                                  progress of one learning session, so a
--                                  student can resume on any device and a
--                                  teacher can read it.
--   language_check_learn_rounds    every FINISHED quiz round (items + answers);
--                                  a retake never overwrites an earlier one.
--   language_check_learn_events    activity ledger behind both dashboards.
--                                  Survives session/essay deletion on purpose
--                                  (progress over time); removed only with the
--                                  user.

CREATE TABLE IF NOT EXISTS language_check_learn_sessions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Kept (NULL) when the essay is deleted: the learning history stays.
  essay_id         TEXT REFERENCES language_check_essays(id) ON DELETE SET NULL,
  essay_title      TEXT NOT NULL DEFAULT '',
  -- essay + chosen categories + level: the same selection resumes this session.
  selection_key    TEXT NOT NULL,
  age              INTEGER NOT NULL,
  current_location JSONB NOT NULL DEFAULT '{"unit":0,"stage":"lesson"}'::jsonb,
  units            JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Lightweight per-unit progress (LearnUnitSummary[]) so lists never read `units`.
  summary          JSONB NOT NULL DEFAULT '[]'::jsonb,
  status           TEXT NOT NULL DEFAULT 'in_progress'
                   CHECK (status IN ('in_progress', 'completed')),
  unit_count       INTEGER NOT NULL DEFAULT 0,
  units_completed  INTEGER NOT NULL DEFAULT 0,
  avg_quiz_percent INTEGER,
  completed_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_learn_sessions_user
  ON language_check_learn_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_learn_sessions_selection
  ON language_check_learn_sessions(user_id, selection_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_learn_sessions_essay
  ON language_check_learn_sessions(essay_id);

DROP TRIGGER IF EXISTS update_lc_learn_sessions_updated_at ON language_check_learn_sessions;
CREATE TRIGGER update_lc_learn_sessions_updated_at
    BEFORE UPDATE ON language_check_learn_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS language_check_learn_rounds (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL REFERENCES language_check_learn_sessions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  round        INTEGER NOT NULL,
  percent      INTEGER NOT NULL,
  correct      INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  mastery      TEXT NOT NULL CHECK (mastery IN ('secure', 'developing', 'review')),
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  results      JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (session_id, category, round)
);

CREATE INDEX IF NOT EXISTS idx_lc_learn_rounds_user
  ON language_check_learn_rounds(user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS language_check_learn_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT REFERENCES language_check_learn_sessions(id) ON DELETE SET NULL,
  essay_id    TEXT,
  essay_title TEXT NOT NULL DEFAULT '',
  category    TEXT,
  type        TEXT NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Idempotency key: a replayed save (retry after a lost response, a second
  -- tab or device) inserts nothing twice.
  event_key   TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lc_learn_events_key
  ON language_check_learn_events(user_id, event_key) WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lc_learn_events_user
  ON language_check_learn_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_learn_events_created
  ON language_check_learn_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_learn_events_session
  ON language_check_learn_events(session_id);

GRANT ALL PRIVILEGES ON language_check_learn_sessions TO reading_user;
GRANT ALL PRIVILEGES ON language_check_learn_rounds TO reading_user;
GRANT ALL PRIVILEGES ON language_check_learn_events TO reading_user;
GRANT ALL PRIVILEGES ON SEQUENCE language_check_learn_events_id_seq TO reading_user;

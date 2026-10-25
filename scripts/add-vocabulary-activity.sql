-- Vocabulary activity ledger (/vocabulary): append-only log behind the staff
-- "Student analytics" view (class dashboard, per-student progress, activity feed).
-- Survives deleting words / review sessions on purpose (progress over time);
-- removed only with the user.

CREATE TABLE IF NOT EXISTS vocabulary_activity_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  entry_type TEXT,
  word       TEXT,
  details    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Idempotency key (e.g. "rs:<review session id>"): a replay inserts nothing twice.
  event_key  TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_activity_key
  ON vocabulary_activity_events(user_id, event_key) WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vocab_activity_user
  ON vocabulary_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_activity_created
  ON vocabulary_activity_events(created_at DESC);

GRANT ALL PRIVILEGES ON vocabulary_activity_events TO reading_user;
GRANT ALL PRIVILEGES ON SEQUENCE vocabulary_activity_events_id_seq TO reading_user;

-- Backfill: every existing review session becomes a `session_completed` event,
-- so dashboards show history from before the ledger existed.
INSERT INTO vocabulary_activity_events (user_id, type, entry_type, details, event_key, created_at)
SELECT s.user_id,
       'session_completed',
       COALESCE(NULLIF(s.entry_type, ''), 'word'),
       jsonb_build_object(
         'sessionId', s.id,
         'mode', s.mode,
         'total', s.total_words,
         'correct', s.correct_count,
         'accuracy', s.accuracy
       ),
       'rs:' || s.id,
       to_timestamp(s.completed_at / 1000.0)
FROM vocabulary_review_sessions s
WHERE s.completed_at > 0
ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

-- Backfill: words/phrases already in each word bank, one event per learner,
-- day (UTC) and entry type.
INSERT INTO vocabulary_activity_events (user_id, type, entry_type, details, event_key, created_at)
SELECT v.user_id,
       'words_added',
       v.entry_type,
       jsonb_build_object('count', COUNT(*), 'source', 'backfill'),
       'wa-bf:' || v.entry_type || ':' || to_char(to_timestamp(v.created_at / 1000.0) AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
       MIN(to_timestamp(v.created_at / 1000.0))
FROM user_vocabulary v
WHERE v.created_at > 0 AND v.shared_by IS NULL
GROUP BY v.user_id, v.entry_type, to_char(to_timestamp(v.created_at / 1000.0) AT TIME ZONE 'UTC', 'YYYY-MM-DD')
ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

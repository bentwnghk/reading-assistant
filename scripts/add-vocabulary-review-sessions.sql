-- ─── Vocabulary Review Sessions ────────────────────────────────────────────
-- Tracks each vocabulary review session and per-word results.
-- Safe to re-run (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS vocabulary_review_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('flashcard', 'quiz', 'spelling')),
  total_words INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy INTEGER NOT NULL DEFAULT 0,
  started_at BIGINT NOT NULL DEFAULT 0,
  completed_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vocabulary_review_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES vocabulary_review_sessions(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  mastery_before INTEGER NOT NULL DEFAULT 0,
  mastery_after INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_review_sessions_user_date
  ON vocabulary_review_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_results_session
  ON vocabulary_review_results(session_id);

-- Speeds up the sign-in session list (GET /api/sessions):
--   WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 500
-- The single-column indexes force a sort of all of a user's rows (or a scan of
-- the global updated_at index); this composite index serves the query in order.
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_updated
  ON reading_sessions(user_id, updated_at DESC);

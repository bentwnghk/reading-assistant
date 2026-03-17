-- Leaderboard system migration
-- Run this after init-db.sql has been applied

-- Activity log table: records every scoreable learning event
-- NOTE: If you already ran an earlier version of this script, run
--       add-achievements.sql instead to upgrade the CHECK constraint.
CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN (
      'session_create',
      'test_complete',
      'quiz_complete',
      'spelling_complete',
      'flashcard_review',
      'mindmap_generate',
      'adapted_text_generate',
      'simplified_text_generate',
      'sentence_analyze',
      'targeted_practice_complete',
      'glossary_add'
    )),
  session_id  TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  score       INTEGER,           -- raw score/percentage for the activity (0-100 for tests; raw points for spelling)
  details     JSONB DEFAULT '{}'::jsonb,  -- e.g. { "cardsReviewed": 5, "wordCount": 12 }
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date
  ON activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type
  ON activity_logs (activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session
  ON activity_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_week
  ON activity_logs (user_id, date_trunc('week', created_at));

-- Weekly pre-computed stats (refreshed by /api/leaderboard/refresh)
-- week_start_date is always Monday (ISO week start)
CREATE TABLE IF NOT EXISTS weekly_stats (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date           DATE NOT NULL,
  total_sessions            INTEGER   DEFAULT 0,
  reading_streak_days       INTEGER   DEFAULT 0,
  avg_test_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  total_flashcard_reviews   INTEGER       DEFAULT 0,
  avg_quiz_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_spelling_score        NUMERIC(10,2) DEFAULT 0,  -- raw game points, unbounded
  total_vocabulary_words    INTEGER       DEFAULT 0,
  tests_completed           INTEGER       DEFAULT 0,
  quizzes_completed         INTEGER       DEFAULT 0,
  spelling_games_completed  INTEGER       DEFAULT 0,
  weekly_score              NUMERIC(10,2) DEFAULT 0,  -- composite score, unbounded
  improvement_score         NUMERIC(10,2) DEFAULT 0,  -- week-over-week delta, can be negative/large
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_stats_user
  ON weekly_stats (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week
  ON weekly_stats (week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_score
  ON weekly_stats (week_start_date DESC, weekly_score DESC);

DROP TRIGGER IF EXISTS update_weekly_stats_updated_at ON weekly_stats;
CREATE TRIGGER update_weekly_stats_updated_at
  BEFORE UPDATE ON weekly_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (same role as init-db.sql)
GRANT ALL PRIVILEGES ON TABLE activity_logs    TO reading_user;
GRANT ALL PRIVILEGES ON TABLE weekly_stats     TO reading_user;

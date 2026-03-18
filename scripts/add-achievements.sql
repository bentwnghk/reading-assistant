-- Achievements system migration
-- Run this on any database that already has init-db.sql + add-leaderboard.sql applied.
-- Safe to run multiple times (all statements use IF NOT EXISTS / DO $$ guards).

-- ─── 1. Expand the activity_logs CHECK constraint ─────────────────────────────
-- PostgreSQL does not support ALTER TABLE ... ALTER CONSTRAINT, so we drop the
-- old check and add the new one that includes the six new activity types.

ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_activity_type_check
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
      'glossary_add',
      'ai_tutor_question'
    ));

-- ─── 2. Expand the user_achievements CHECK constraint ────────────────────────
-- Drop and recreate so the constraint picks up any newly added achievement types.
ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_achievement_type_check;

ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_achievement_type_check
    CHECK (achievement_type IN (
      'sessions_read',
      'vocabulary_collected',
      'flashcard_reviews',
      'mindmaps_generated',
      'adapted_texts',
      'simplified_texts',
      'sentences_analyzed',
      'tests_completed',
      'targeted_practices',
      'spelling_challenges',
      'vocabulary_quizzes',
      'ai_tutor_questions'
    ));

-- ─── 3. Create the user_achievements table (fresh installs) ──────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id               SERIAL PRIMARY KEY,
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT        NOT NULL
    CHECK (achievement_type IN (
      'sessions_read',
      'vocabulary_collected',
      'flashcard_reviews',
      'mindmaps_generated',
      'adapted_texts',
      'simplified_texts',
      'sentences_analyzed',
      'tests_completed',
      'targeted_practices',
      'spelling_challenges',
      'vocabulary_quizzes',
      'ai_tutor_questions'
    )),
  milestone        INTEGER     NOT NULL,   -- the target that was reached (e.g. 5, 10, 20 …)
  unlocked_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, achievement_type, milestone)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type
  ON user_achievements (user_id, achievement_type);

-- ─── 4. Grant permissions ─────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON TABLE user_achievements TO reading_user;
GRANT ALL PRIVILEGES ON SEQUENCE user_achievements_id_seq TO reading_user;

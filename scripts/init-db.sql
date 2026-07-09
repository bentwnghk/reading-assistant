-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update updated_at timestamp (must be created before tables that use it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Auth.js required tables (quoted camelCase column names for @auth/pg-adapter compatibility)
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  image TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions("userId");

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(identifier, token)
);

-- Application tables
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE reading_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_title TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'repository' CHECK (source IN ('upload', 'repository', 'shared', 'assignment', 'ai-generated')),
  student_age INTEGER DEFAULT 13,
  extracted_text TEXT NOT NULL,
  generated_text_meta JSONB,
  summary TEXT DEFAULT '',
  adapted_text TEXT DEFAULT '',
  simplified_text TEXT DEFAULT '',
  highlighted_words JSONB DEFAULT '[]'::jsonb,
  analyzed_sentences JSONB DEFAULT '{}'::jsonb,
  mind_map TEXT DEFAULT '',
  visualization_image TEXT DEFAULT '',
  visualization_generated_at BIGINT DEFAULT 0,
  reading_test JSONB DEFAULT '[]'::jsonb,
  glossary JSONB DEFAULT '[]'::jsonb,
  glossary_ratings JSONB DEFAULT '{}'::jsonb,
  test_score INTEGER DEFAULT 0,
  test_completed BOOLEAN DEFAULT false,
  test_earned_points INTEGER DEFAULT 0,
  test_total_points INTEGER DEFAULT 0,
  test_show_chinese BOOLEAN DEFAULT false,
  test_mode TEXT DEFAULT 'all-at-once',
  vocabulary_quiz_score INTEGER DEFAULT 0,
  spelling_game_best_score INTEGER DEFAULT 0,
  spelling_game_accuracy INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  vocab_quizzes_completed INTEGER DEFAULT 0,
  spelling_games_completed INTEGER DEFAULT 0,
  flashcard_review_dates JSONB DEFAULT '[]',
  summary_generated_at BIGINT DEFAULT 0,
  mind_map_generated_at BIGINT DEFAULT 0,
  adapted_text_generated_at BIGINT DEFAULT 0,
  simplified_text_generated_at BIGINT DEFAULT 0,
  glossary_generated_at BIGINT DEFAULT 0,
  spelling_game_completed_at BIGINT DEFAULT 0,
  vocab_quiz_completed_at BIGINT DEFAULT 0,
  reading_test_completed_at BIGINT DEFAULT 0,
  chat_history JSONB DEFAULT '[]'::jsonb,
  original_difficulty JSONB,
  adapted_difficulty JSONB,
  simplified_difficulty JSONB,
  include_glossary BOOLEAN DEFAULT true,
  include_sentence_analysis BOOLEAN DEFAULT true,
  grammar_topics JSONB DEFAULT '[]'::jsonb,
  grammar_quiz JSONB DEFAULT '[]'::jsonb,
  grammar_quiz_score INTEGER DEFAULT 0,
  grammar_quiz_completed BOOLEAN DEFAULT false,
  grammar_quizzes_completed INTEGER DEFAULT 0,
  grammar_quiz_earned_points INTEGER DEFAULT 0,
  grammar_quiz_total_points INTEGER DEFAULT 0,
  grammar_generated_at BIGINT DEFAULT 0,
  grammar_quiz_completed_at BIGINT DEFAULT 0,
  grammar_highlight_enabled BOOLEAN DEFAULT false,
  grammar_highlight_topic_id TEXT DEFAULT NULL,
  grammar_quiz_mode TEXT NOT NULL DEFAULT 'all-at-once',
  grammar_scramble_high_score  INTEGER DEFAULT 0,
  grammar_workshop_high_score  INTEGER DEFAULT 0,
  grammar_surgery_high_score   INTEGER DEFAULT 0,
  grammar_roulette_high_score  INTEGER DEFAULT 0,
  grammar_duel_high_score      INTEGER DEFAULT 0,
  grammar_game_accuracy        INTEGER DEFAULT 0,
  grammar_games_completed      INTEGER DEFAULT 0,
  grammar_game_completed_at    TIMESTAMP WITH TIME ZONE,
  grammar_scramble_accuracy    INTEGER DEFAULT 0,
  grammar_workshop_accuracy    INTEGER DEFAULT 0,
  grammar_surgery_accuracy     INTEGER DEFAULT 0,
  grammar_roulette_accuracy    INTEGER DEFAULT 0,
  grammar_duel_accuracy        INTEGER DEFAULT 0,
  grammar_scramble_completed   INTEGER DEFAULT 0,
  grammar_workshop_completed   INTEGER DEFAULT 0,
  grammar_surgery_completed    INTEGER DEFAULT 0,
  grammar_roulette_completed   INTEGER DEFAULT 0,
  grammar_duel_completed       INTEGER DEFAULT 0,
  grammar_error_challenges     JSONB DEFAULT '[]'::jsonb,
  grammar_scramble_challenges  JSONB DEFAULT '[]'::jsonb,
  grammar_workshop_challenges  JSONB DEFAULT '[]'::jsonb,
  grammar_game_questions       JSONB DEFAULT '[]'::jsonb,
  assignment_id                TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_session UNIQUE(id, user_id)
);

CREATE INDEX idx_reading_sessions_assignment
  ON reading_sessions(assignment_id);

-- Separate images table with BYTEA binary storage
CREATE TABLE reading_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_data BYTEA NOT NULL,
  image_order INTEGER NOT NULL,
  content_type TEXT DEFAULT 'image/png',
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_session_user 
    FOREIGN KEY (session_id, user_id) 
    REFERENCES reading_sessions(id, user_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT unique_image_order UNIQUE(session_id, image_order)
);

-- Performance indexes
CREATE INDEX idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_created_at ON reading_sessions(created_at DESC);
CREATE INDEX idx_reading_sessions_updated_at ON reading_sessions(updated_at DESC);

CREATE INDEX idx_reading_images_session_id ON reading_images(session_id);
CREATE INDEX idx_reading_images_user_id ON reading_images(user_id);
CREATE INDEX idx_reading_images_session_order ON reading_images(session_id, image_order);

-- Trigger to update updated_at on reading_sessions
CREATE TRIGGER update_reading_sessions_updated_at 
    BEFORE UPDATE ON reading_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- User roles table (extends Auth.js users)
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super-admin', 'admin', 'teacher', 'student')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Schools table (auto-created from user email domains; defined before classes so classes can FK-reference it)
CREATE TABLE schools (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schools_domain ON schools(domain);

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add school reference to users
ALTER TABLE users ADD COLUMN school_id TEXT REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX idx_users_school_id ON users(school_id);

-- Grace period timestamp for revoking school subscription access.
-- When set, the user retains school access until this time; the cron job
-- then sets school_id = NULL.
ALTER TABLE users ADD COLUMN school_access_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ADD COLUMN school_manually_removed BOOLEAN DEFAULT FALSE;

-- Classes table (belongs to a school)
CREATE TABLE classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_name ON classes(name);

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Class memberships (one student can only be in one class)
CREATE TABLE class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (student_id)
);

CREATE INDEX idx_class_members_class_id ON class_members(class_id);

-- ─── Leaderboard tables ───────────────────────────────────────────────────────

-- Activity log table: records every scoreable learning event
CREATE TABLE activity_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      'glossary_add',
      'grammar_analyze',
      'grammar_quiz_complete',
      'grammar_scramble_complete',
      'grammar_workshop_complete',
      'grammar_surgery_complete',
      'grammar_roulette_complete',
      'grammar_duel_complete',
      'ai_tutor_question',
      'visualization_generate',
      'reading_text_generate',
      'assignment_create',
      'assignment_start',
      'assignment_submit'
    )),
  session_id    TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  score         INTEGER,          -- raw score/percentage (0-100 for tests; raw points for spelling)
  accuracy      INTEGER,          -- accuracy percentage (0-100) for games/quizzes
  details       JSONB DEFAULT '{}'::jsonb,  -- e.g. { "cardsReviewed": 5, "wordCount": 12 }
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_date
  ON activity_logs (user_id, created_at DESC);
CREATE INDEX idx_activity_logs_type
  ON activity_logs (activity_type);
CREATE INDEX idx_activity_logs_session
  ON activity_logs (session_id);
CREATE INDEX idx_activity_logs_week
  ON activity_logs (user_id, date_trunc('week', created_at));

-- Weekly pre-computed stats (refreshed by /api/leaderboard/refresh)
-- week_start_date is always Monday (ISO week start)
CREATE TABLE weekly_stats (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date           DATE NOT NULL,
  total_sessions            INTEGER      DEFAULT 0,
  reading_streak_days       INTEGER      DEFAULT 0,
  avg_test_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  total_flashcard_reviews   INTEGER       DEFAULT 0,
  avg_quiz_score            NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_spelling_score        NUMERIC(10,2) DEFAULT 0,  -- raw game points, unbounded
  avg_spelling_accuracy     NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_quiz_score    NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_game_score    NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  avg_grammar_game_accuracy NUMERIC(6,2)  DEFAULT 0,  -- 0–100 %
  total_vocabulary_words    INTEGER       DEFAULT 0,
  tests_completed           INTEGER       DEFAULT 0,
  quizzes_completed         INTEGER       DEFAULT 0,
  spelling_games_completed  INTEGER       DEFAULT 0,
  grammar_quizzes_completed INTEGER       DEFAULT 0,
  grammar_games_completed   INTEGER       DEFAULT 0,
  weekly_score              NUMERIC(10,2) DEFAULT 0,  -- composite score, unbounded
  improvement_score         NUMERIC(10,2) DEFAULT 0,  -- week-over-week delta, can be negative/large
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX idx_weekly_stats_user
  ON weekly_stats (user_id);
CREATE INDEX idx_weekly_stats_week
  ON weekly_stats (week_start_date DESC);
CREATE INDEX idx_weekly_stats_score
  ON weekly_stats (week_start_date DESC, weekly_score DESC);

CREATE TRIGGER update_weekly_stats_updated_at
  BEFORE UPDATE ON weekly_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Achievements tables ──────────────────────────────────────────────────────

-- Stores each milestone a user has unlocked for each achievement type.
-- Achievement types mirror the activity_type vocabulary but at a higher level
-- (e.g. "sessions_read" aggregates 'session_create' events).
-- New milestones are generated dynamically by doubling the previous target,
-- so only completed milestones are persisted here.
CREATE TABLE user_achievements (
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
      'ai_tutor_questions',
      'grammar_analysis',
      'grammar_quizzes',
      'grammar_games'
    )),
  milestone        INTEGER     NOT NULL,   -- the target that was reached (e.g. 5, 10, 20 …)
  unlocked_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, achievement_type, milestone)
);

CREATE INDEX idx_user_achievements_user
  ON user_achievements (user_id);
CREATE INDEX idx_user_achievements_type
  ON user_achievements (user_id, achievement_type);

-- ─── Chat Questions table ──────────────────────────────────────────────────────

-- Tracks AI tutor questions for analytics and activity logging
CREATE TABLE chat_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  doc_title TEXT,
  response_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_questions_hash ON chat_questions(question_hash);
CREATE INDEX idx_chat_questions_user ON chat_questions(user_id);
CREATE INDEX idx_chat_questions_created ON chat_questions(created_at DESC);
CREATE INDEX idx_chat_questions_session ON chat_questions(session_id);

-- ─── Text Repository tables ───────────────────────────────────────────────────

-- Stores shared reading texts uploaded by admins.
-- Texts can be scoped to a school (school_id) or made globally public (is_public = TRUE).
CREATE TABLE text_repository (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,                          -- Admin-given display name (renameable)
  title          TEXT DEFAULT '',                        -- AI-generated title
  extracted_text TEXT NOT NULL,
  school_id      TEXT REFERENCES schools(id) ON DELETE SET NULL,
  is_public      BOOLEAN NOT NULL DEFAULT FALSE,          -- TRUE = visible to users of all schools
  visibility     TEXT NOT NULL DEFAULT 'school' CHECK (visibility IN ('class', 'school', 'public')),
  class_id       TEXT REFERENCES classes(id) ON DELETE SET NULL,
  created_by     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_text_repository_school_id   ON text_repository(school_id);
CREATE INDEX idx_text_repository_is_public   ON text_repository(is_public);
CREATE INDEX idx_text_repository_visibility  ON text_repository(visibility);
CREATE INDEX idx_text_repository_class_id    ON text_repository(class_id);
CREATE INDEX idx_text_repository_created_by  ON text_repository(created_by);
CREATE INDEX idx_text_repository_updated_at  ON text_repository(updated_at DESC);

CREATE TRIGGER update_text_repository_updated_at
  BEFORE UPDATE ON text_repository
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Stores the images associated with each repository text entry.
CREATE TABLE text_repository_images (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id      TEXT NOT NULL REFERENCES text_repository(id) ON DELETE CASCADE,
  image_data   BYTEA NOT NULL,
  image_order  INTEGER NOT NULL DEFAULT 0,
  content_type TEXT DEFAULT 'image/png',
  file_size    INTEGER,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_repo_image_order UNIQUE (text_id, image_order)
);

CREATE INDEX idx_text_repository_images_text_id ON text_repository_images(text_id);

-- ─── Email Reminder tables ──────────────────────────────────────────────────

-- Tracks sent email reminders to prevent duplicate sends within a throttle window.
CREATE TABLE email_reminder_logs (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_inactive       INTEGER NOT NULL,
  last_activity_type  TEXT,
  last_activity_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_reminder_logs_user ON email_reminder_logs(user_id);
CREATE INDEX idx_email_reminder_logs_sent ON email_reminder_logs(sent_at DESC);

-- User email reminder preferences (separate from user_settings to avoid sync conflicts).
CREATE TABLE email_reminder_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  frequency_days  INTEGER NOT NULL DEFAULT 3 CHECK (frequency_days >= 1),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_reminder_preferences_user ON email_reminder_preferences(user_id);

CREATE TRIGGER update_email_reminder_preferences_updated_at
    BEFORE UPDATE ON email_reminder_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Subscriptions table ──────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'inactive')),
  plan TEXT CHECK (plan IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Shared Sessions table ─────────────────────────────────────────────────────

CREATE TABLE shared_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  doc_title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_sessions_recipient_status
  ON shared_sessions(recipient_id, status);

CREATE INDEX idx_shared_sessions_sender
  ON shared_sessions(sender_id);

CREATE TRIGGER update_shared_sessions_updated_at
  BEFORE UPDATE ON shared_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── User Vocabulary table ──────────────────────────────────────────────────

CREATE TABLE user_vocabulary (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  syllabification TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT '',
  english_definition TEXT DEFAULT '',
  chinese_definition TEXT DEFAULT '',
  example TEXT DEFAULT '',
  rating TEXT DEFAULT NULL CHECK (rating IS NULL OR rating IN ('easy', 'medium', 'hard')),
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at BIGINT NOT NULL DEFAULT 0,
  next_review_at BIGINT NOT NULL DEFAULT 0,
  source_session_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  shared_by TEXT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  srs_counts JSONB NOT NULL DEFAULT '{"hard":0,"medium":0}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, word)
);

CREATE INDEX idx_user_vocabulary_user_id ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocabulary_next_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX idx_user_vocabulary_rating ON user_vocabulary(user_id, rating);
CREATE INDEX idx_user_vocabulary_mastery ON user_vocabulary(user_id, mastery_level);
CREATE INDEX idx_user_vocabulary_word ON user_vocabulary(user_id, word);
CREATE INDEX idx_user_vocabulary_shared_by ON user_vocabulary(user_id, shared_by);

CREATE TABLE vocabulary_review_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('flashcard', 'quiz', 'spelling')),
  total_words INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy INTEGER NOT NULL DEFAULT 0,
  rating_counts JSONB,
  started_at BIGINT NOT NULL DEFAULT 0,
  completed_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE vocabulary_review_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES vocabulary_review_sessions(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  mastery_before INTEGER NOT NULL DEFAULT 0,
  mastery_after INTEGER NOT NULL DEFAULT 0,
  rating TEXT,
  attempts INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_review_sessions_user_date ON vocabulary_review_sessions(user_id, completed_at DESC);
CREATE INDEX idx_review_results_session ON vocabulary_review_results(session_id);

-- ─── Review Lists ─────────────────────────────────────────────────────────

CREATE TABLE review_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_review_lists_created_by ON review_lists(created_by);
CREATE INDEX idx_review_lists_created_at ON review_lists(created_by, created_at DESC);

CREATE TABLE shared_review_lists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_list_id TEXT NOT NULL REFERENCES review_lists(id) ON DELETE CASCADE,
  review_list_name TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_review_lists_recipient ON shared_review_lists(recipient_id, status);
CREATE INDEX idx_shared_review_lists_sender ON shared_review_lists(sender_id);

-- ─── Assignments (Language-across-the-Curriculum homework) ────────────────────

CREATE TABLE assignments (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  description              TEXT DEFAULT '',
  subject                  TEXT DEFAULT '',
  source_session_id        TEXT,
  source_session_snapshot  JSONB NOT NULL,
  source_doc_title         TEXT DEFAULT '',
  due_date                 TIMESTAMP WITH TIME ZONE,
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'archived')),
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assignments_teacher ON assignments(teacher_id, status);
CREATE INDEX idx_assignments_due ON assignments(due_date);

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE assignment_submissions (
  id                         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id              TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_session_id         TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  progress                   INTEGER NOT NULL DEFAULT 0,
  test_score                 INTEGER,
  test_completed             BOOLEAN NOT NULL DEFAULT FALSE,
  vocabulary_quiz_score      INTEGER,
  spelling_game_best_score   INTEGER,
  spelling_game_accuracy     INTEGER,
  grammar_quiz_score         INTEGER,
  grammar_game_best_score    INTEGER,
  grammar_game_accuracy      INTEGER,
  last_viewed_at             TIMESTAMP WITH TIME ZONE,
  submitted_at               TIMESTAMP WITH TIME ZONE,
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);

-- ─── Assignment Presets (saved reusable student rosters, shared school-wide) ──

CREATE TABLE assignment_presets (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (school_id, name)
);

CREATE INDEX idx_assignment_presets_teacher ON assignment_presets(teacher_id);
CREATE INDEX idx_assignment_presets_school ON assignment_presets(school_id);

CREATE TRIGGER update_assignment_presets_updated_at
    BEFORE UPDATE ON assignment_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reading_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reading_user;

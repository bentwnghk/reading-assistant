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
  student_age INTEGER DEFAULT 13,
  extracted_text TEXT NOT NULL,
  summary TEXT DEFAULT '',
  adapted_text TEXT DEFAULT '',
  simplified_text TEXT DEFAULT '',
  highlighted_words JSONB DEFAULT '[]'::jsonb,
  analyzed_sentences JSONB DEFAULT '{}'::jsonb,
  mind_map TEXT DEFAULT '',
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
  chat_history JSONB DEFAULT '[]'::jsonb,
  original_difficulty JSONB,
  adapted_difficulty JSONB,
  simplified_difficulty JSONB,
  include_glossary BOOLEAN DEFAULT true,
  include_sentence_analysis BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_session UNIQUE(id, user_id)
);

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
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
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
      'flashcard_review'
    )),
  session_id    TEXT REFERENCES reading_sessions(id) ON DELETE SET NULL,
  score         INTEGER,          -- raw score/percentage (0-100 for tests; raw points for spelling)
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
  avg_test_score            NUMERIC(5,2) DEFAULT 0,
  total_flashcard_reviews   INTEGER      DEFAULT 0,
  avg_quiz_score            NUMERIC(5,2) DEFAULT 0,
  avg_spelling_score        NUMERIC(5,2) DEFAULT 0,
  total_vocabulary_words    INTEGER      DEFAULT 0,
  tests_completed           INTEGER      DEFAULT 0,
  quizzes_completed         INTEGER      DEFAULT 0,
  spelling_games_completed  INTEGER      DEFAULT 0,
  weekly_score              NUMERIC(8,2) DEFAULT 0,  -- composite score
  improvement_score         NUMERIC(5,2) DEFAULT 0,  -- week-over-week delta
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

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reading_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reading_user;

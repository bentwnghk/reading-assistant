-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on reading_sessions
CREATE TRIGGER update_reading_sessions_updated_at 
    BEFORE UPDATE ON reading_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reading_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reading_user;

-- Add chat_questions table for tracking AI tutor questions

CREATE TABLE IF NOT EXISTS chat_questions (
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

CREATE INDEX IF NOT EXISTS idx_chat_questions_hash ON chat_questions(question_hash);
CREATE INDEX IF NOT EXISTS idx_chat_questions_user ON chat_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_questions_created ON chat_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_questions_session ON chat_questions(session_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE chat_questions TO reading_user;

-- Diagnostic Skill Profile feature (v2.x)
-- Per-session skill breakdown snapshot + cross-session rollup table.

-- Per-session snapshot of per-skill performance, written when a reading test
-- is completed. Shape: { main-idea: {earned,total,correct,count}, ... }
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS skill_breakdown JSONB;

-- Cross-session rollup, incrementally upserted on each test completion.
-- Cheap O(1) read for the dashboard / teacher views (mirrors weekly_stats).
CREATE TABLE IF NOT EXISTS user_skill_profile (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- profile shape: { "<skill>": {earned,total,correct,count,sessions}, ... }
  profile       JSONB NOT NULL DEFAULT '{}'::jsonb,
  weakest_skill TEXT,
  updated_at    BIGINT NOT NULL DEFAULT 0
);

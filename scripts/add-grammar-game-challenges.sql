-- Migration: add AI-generated challenge caches for grammar games
-- Apply after: add-grammar-games.sql

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_scramble_challenges  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grammar_workshop_challenges  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grammar_game_questions       JSONB DEFAULT '[]'::jsonb;

-- Migration: add grammar games high scores and error challenge cache
-- Apply after: add-grammar-columns.sql

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS grammar_scramble_high_score  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_workshop_high_score  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_surgery_high_score   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_roulette_high_score  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_duel_high_score      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grammar_error_challenges     JSONB DEFAULT '[]'::jsonb;

-- Extend the activity_type CHECK constraint to include grammar game activity types
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
      'grammar_analyze',
      'grammar_quiz_complete',
      'grammar_scramble_complete',
      'grammar_workshop_complete',
      'grammar_surgery_complete',
      'grammar_roulette_complete',
      'grammar_duel_complete',
      'ai_tutor_question'
    ));

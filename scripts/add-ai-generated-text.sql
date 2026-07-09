-- Migration: AI-generated reading text support
-- Adds the generated_text_meta JSONB column (QC metadata: topic, CEFR, FK grade,
-- new vocabulary, etc.), the 'ai-generated' source value, and the
-- 'reading_text_generate' activity type for leaderboard tracking.
--
-- Apply after add-assignments.sql (the last migration that touched the source
-- CHECK constraint).

-- 1. QC metadata column for AI-generated reading texts.
ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS generated_text_meta JSONB;

-- 2. Add 'ai-generated' to the source CHECK constraint.
ALTER TABLE reading_sessions DROP CONSTRAINT IF EXISTS reading_sessions_source_check;
ALTER TABLE reading_sessions ADD CONSTRAINT reading_sessions_source_check
  CHECK (source IN ('upload', 'repository', 'shared', 'assignment', 'ai-generated'));

-- 3. Add 'reading_text_generate' to the activity_type CHECK constraint.
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_activity_type_check
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
  ));

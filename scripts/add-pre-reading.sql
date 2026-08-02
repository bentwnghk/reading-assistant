-- Pre-Reading Phase feature (v2.x)
-- Adds pre-reading scaffolding + student prediction capture.
-- Content fields (pre_reading, *_generated_at) are session content, kept on
-- share. student_prediction / prediction_rating are per-user, zeroed on share.

-- Drop the prediction-image columns if a previous migration added them
-- (the image-generation feature was removed). Idempotent.
ALTER TABLE reading_sessions
  DROP COLUMN IF EXISTS pre_reading_image,
  DROP COLUMN IF EXISTS pre_reading_image_generated_at;

ALTER TABLE reading_sessions
  ADD COLUMN IF NOT EXISTS pre_reading JSONB,
  ADD COLUMN IF NOT EXISTS pre_reading_generated_at BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_prediction TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS prediction_rating INTEGER;

-- Extend activity_type CHECK constraint to include the new pre-reading activity.
-- First remove orphaned rows from the removed image-generation feature, since
-- the new CHECK no longer allows that value (otherwise re-adding fails).
DELETE FROM activity_logs WHERE activity_type = 'pre_reading_image_generate';

ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_activity_type_check CHECK (activity_type IN (
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
    'pre_reading_generate',
    'collocations_generate',
    'assignment_create',
    'assignment_start',
    'assignment_submit'
  ));

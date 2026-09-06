-- Feature: Feature Popularity analytics (User Management → Feature Popularity)
-- Adds 'tts_playback' to the activity_logs activity_type CHECK constraint so
-- Read Along / TTS playback events (logged from src/utils/tts.ts) are stored.
-- NOTE: no historical TTS data exists — counts accrue from deployment onward.

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_activity_type_check
  CHECK (activity_type IN (
    'session_create',
    'test_complete',
    'quiz_complete',
    'spelling_complete',
    'spelling_battle_win',
    'spelling_hot_streak',
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
    'grammar_hot_streak',
    'ai_tutor_question',
    'visualization_generate',
    'reading_text_generate',
    'pre_reading_generate',
    'collocations_generate',
    'tts_playback',
    'assignment_create',
    'assignment_start',
    'assignment_submit'
  ));

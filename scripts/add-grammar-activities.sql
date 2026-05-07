-- Add grammar activity types to the activity_logs CHECK constraint
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
      'ai_tutor_question'
    ));

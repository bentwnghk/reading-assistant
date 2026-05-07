-- Add grammar_analysis and grammar_quizzes to the user_achievements check constraint.
-- Run this after add-achievements.sql (or after init-db.sql for fresh installs).

ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_achievement_type_check;

ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_achievement_type_check
    CHECK (achievement_type IN (
      'sessions_read',
      'vocabulary_collected',
      'flashcard_reviews',
      'mindmaps_generated',
      'adapted_texts',
      'simplified_texts',
      'sentences_analyzed',
      'tests_completed',
      'targeted_practices',
      'spelling_challenges',
      'vocabulary_quizzes',
      'ai_tutor_questions',
      'grammar_analysis',
      'grammar_quizzes'
    ));

-- Add grammar_games to the user_achievements check constraint.
-- Run after add-grammar-achievements.sql.

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
      'grammar_quizzes',
      'grammar_games'
    ));

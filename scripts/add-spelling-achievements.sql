-- Add spelling battle-win and hot-streak achievements.
-- Run after add-grammar-games-achievements.sql (or after init-db.sql for fresh
-- installs, which already includes these values).

-- 1. New activity types for the activity log.
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_activity_type_check
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
      'ai_tutor_question',
      'visualization_generate',
      'reading_text_generate',
      'pre_reading_generate',
      'collocations_generate',
      'assignment_create',
      'assignment_start',
      'assignment_submit'
    ));

-- 2. New achievement types.
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
      'spelling_battle_win',
      'spelling_hot_streak',
      'vocabulary_quizzes',
      'ai_tutor_questions',
      'grammar_analysis',
      'grammar_quizzes',
      'grammar_games'
    ));

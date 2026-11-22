-- Word of the Day counts toward the leaderboard reading streak and
-- achievements. Run AFTER add-daily-word.sql on existing installs
-- (init-db.sql already includes everything for fresh installs).

-- 1. New activity type (logged server-side when a day transitions to
--    learned; one row per user per day, so streak dates and achievement
--    counts can never double-count).
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
      'grammar_hot_streak',
      'ai_tutor_question',
      'visualization_generate',
      'reading_text_generate',
      'pre_reading_generate',
      'collocations_generate',
      'assignment_create',
      'assignment_start',
      'assignment_submit',
      'daily_word_complete'
    ));

-- 2. New achievement type (milestones: 7, 14, 28, 56 … completed days).
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
      'grammar_games',
      'grammar_hot_streak',
      'daily_words_learned'
    ));

-- 3. Backfill: every already-learned day becomes one activity at its
--    learned_at timestamp, so existing streaks/achievements include the
--    user's Word-of-the-Day history. Idempotent — re-running inserts
--    nothing (one activity per user per learned_at instant).
INSERT INTO activity_logs (id, user_id, activity_type, details, created_at)
SELECT gen_random_uuid(),
       p.user_id,
       'daily_word_complete',
       jsonb_build_object('word', p.word),
       to_timestamp(p.learned_at / 1000.0)
  FROM daily_word_progress p
 WHERE p.learned_at IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM activity_logs a
      WHERE a.user_id = p.user_id
        AND a.activity_type = 'daily_word_complete'
        AND a.created_at = to_timestamp(p.learned_at / 1000.0)
   );

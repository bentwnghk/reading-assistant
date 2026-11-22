-- Word of the Day completions are recorded in the review-session History
-- (mode 'daily-word': one word, correct). Run AFTER
-- add-vocabulary-review-sessions.sql on existing installs (init-db.sql
-- already includes the value for fresh installs).

ALTER TABLE vocabulary_review_sessions
  DROP CONSTRAINT IF EXISTS vocabulary_review_sessions_mode_check;

ALTER TABLE vocabulary_review_sessions
  ADD CONSTRAINT vocabulary_review_sessions_mode_check
    CHECK (mode IN ('flashcard', 'quiz', 'spelling', 'daily-word'));

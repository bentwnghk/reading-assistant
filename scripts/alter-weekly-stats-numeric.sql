-- Widen NUMERIC columns in weekly_stats that overflowed.
-- Safe to run on a live database; ALTER COLUMN TYPE on NUMERIC-to-wider-NUMERIC
-- does not rewrite the table in Postgres 16 (it's a metadata-only change).

ALTER TABLE weekly_stats
  ALTER COLUMN avg_test_score   TYPE NUMERIC(6,2),
  ALTER COLUMN avg_quiz_score   TYPE NUMERIC(6,2),
  ALTER COLUMN avg_spelling_score  TYPE NUMERIC(10,2),
  ALTER COLUMN weekly_score        TYPE NUMERIC(10,2),
  ALTER COLUMN improvement_score   TYPE NUMERIC(10,2);

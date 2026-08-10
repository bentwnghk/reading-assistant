-- Migration: Cache precomputed difficulty analysis on text_repository
--
-- Adds a `difficulty` JSONB column storing a TextDifficultyResult
-- (CEFR level, Flesch/Kincaid/ARI/Coleman-Liau/SMOG, word/sentence/syllable
-- counts, CEFR distribution, ...). This cache is consumed by:
--   * the Text Repository table (CEFR / Grade Level / Words chips),
--   * the LearningRecommendation "Here's a text for you!" preview, and
--   * the Text Difficulty Analysis "Original" card (via loadFromRepository).
--
-- The column is populated by the application (src/lib/repository.ts):
--   - on create / update: analyzeTextDifficulty() runs and the result is stored, and
--   - on list read: a BOUNDED number of legacy rows (difficulty IS NULL) are
--     analyzed + persisted per request, so existing data self-backfills over
--     time without any manual script.
--
-- IMPORTANT: the metrics themselves CANNOT be computed in pure SQL. CEFR levels
-- come from the `cefr-analyzer` dictionary, and the readability formulas need
-- syllable counts (heuristic, package `syllable`). There is no pure-SQL way to
-- reproduce them, so this script only adds the column — the values are written
-- by the Node app. Unanalyzable texts (e.g. no English words) are stored as
-- {"unanalyzable":true} so they are not recomputed on every read.

ALTER TABLE text_repository
ADD COLUMN IF NOT EXISTS difficulty JSONB;

GRANT ALL PRIVILEGES ON TABLE text_repository TO reading_user;

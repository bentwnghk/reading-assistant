-- Reclassify existing multi-word vocabulary entries (phrasal verbs, collocations,
-- idioms — e.g. "give up", "in front of") from 'word' to 'phrase' so they appear
-- in the Phrases tab instead of the Table tab. Glossary sync now sets entry_type
-- automatically; this migration brings legacy rows in line.
--
-- A "multi-word" entry is one whose lowercased `word` value contains whitespace
-- (hyphenated compounds like "well-known" are treated as single words and stay
-- as 'word'). Safe to re-run.

UPDATE user_vocabulary
SET entry_type = 'phrase',
    updated_at = COALESCE(updated_at, EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE entry_type = 'word'
  AND word LIKE '% %';

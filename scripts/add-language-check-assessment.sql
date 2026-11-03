-- Grammar Check: saved AI Language (L) assessment (0-7 scores + bilingual feedback).
-- Stored as JSONB on the essay; NULL = never assessed. Cleared when the essay is re-transcribed / re-checked.
ALTER TABLE language_check_essays
  ADD COLUMN IF NOT EXISTS assessment JSONB;

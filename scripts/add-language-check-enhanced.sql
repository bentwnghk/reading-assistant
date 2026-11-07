-- Writing Assessment: saved AI enhanced essays (light + heavy versions).
-- Stored as JSONB on the essay; NULL = never generated. Cleared when the essay is re-transcribed / re-checked.
ALTER TABLE language_check_essays
  ADD COLUMN IF NOT EXISTS enhanced JSONB;

-- Language Check: teacher-uploaded essays.
--
-- A teacher/admin/super-admin can scan a student's handwritten essay on the
-- student's behalf. user_id STAYS the student — the essay must behave exactly
-- as if the student had uploaded it (it lists in their "Your essays" table,
-- they can open/recheck it, and "Learn from mistakes" builds from it because
-- startSession matches essay.user_id). uploaded_by records the staff uploader
-- so they keep owner-level access (transcribe/check are PATCHes) and their
-- own list can attribute the row ("For <student>").

ALTER TABLE language_check_essays
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Uploader's own list: WHERE user_id = $1 OR uploaded_by = $1.
CREATE INDEX IF NOT EXISTS idx_language_check_essays_uploaded_by
  ON language_check_essays(uploaded_by, updated_at DESC)
  WHERE uploaded_by IS NOT NULL;

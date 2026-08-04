-- Force-apply the new default "gpt-5.6-luna" to three model fields, overriding
-- any previously persisted selection for ALL users:
--   - readingTestModel   (AVAILABLE_MODELS)
--   - grammarModel       (AVAILABLE_MODELS)
--   - basicTutorModel    (BASIC_TUTOR_MODELS)
-- All three lists include "gpt-5.6-luna", so the value is schema-valid.
-- The settings column is JSONB; we chain jsonb_set calls to update each nested
-- key in a single UPDATE. No WHERE clause = applies unconditionally (true force).

UPDATE user_settings
SET settings =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          settings,
          '{readingTestModel}', '"gpt-5.6-luna"'::jsonb
        ),
        '{grammarModel}', '"gpt-5.6-luna"'::jsonb
      ),
      '{basicTutorModel}', '"gpt-5.6-luna"'::jsonb
    ),
    updated_at = NOW();

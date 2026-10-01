-- Unified AI Tutor Model migration (removes the Basic/Advanced AI Tutor split)
-- plus retired general model renames. Mirrored client-side by RENAMED_MODELS
-- and TUTOR_MODEL_REPLACEMENTS in src/store/setting.ts.
--
-- 1. Pure model-id renames (applies to every model setting):
--   gpt-5.4-mini     -> claude-sonnet-5-5
--   gemini-3.7-flash -> gemini-3.8-flash
--   gpt-5.1          -> gpt-6.1-sol  (was only ever a readingTextModel value)
-- 2. Retired AI Tutor model remapped to the unified default:
--   gpt-5.6-terra    -> step-3.7-flash
-- 3. Drop the removed basicTutorModel key (the surviving field is tutorModel).
--
-- The settings column is JSONB; the renames below operate on its text form,
-- which is safe because these ids only ever appear as model *values*.

UPDATE user_settings
SET settings = replace(settings::text, '"gpt-5.4-mini"', '"claude-sonnet-5-5"')::jsonb,
    updated_at = NOW()
WHERE settings::text LIKE '%"gpt-5.4-mini"%';

UPDATE user_settings
SET settings = replace(settings::text, '"gemini-3.7-flash"', '"gemini-3.8-flash"')::jsonb,
    updated_at = NOW()
WHERE settings::text LIKE '%"gemini-3.7-flash"%';

UPDATE user_settings
SET settings = replace(settings::text, '"gpt-5.1"', '"gpt-6.1-sol"')::jsonb,
    updated_at = NOW()
WHERE settings::text LIKE '%"gpt-5.1"%';

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{tutorModel}', '"step-3.7-flash"'::jsonb
    ),
    updated_at = NOW()
WHERE settings->>'tutorModel' = 'gpt-5.6-terra';

UPDATE user_settings
SET settings = settings - 'basicTutorModel',
    updated_at = NOW()
WHERE settings ? 'basicTutorModel';

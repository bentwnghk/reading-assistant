-- Remap retired Advanced AI Tutor models to their replacements in user_settings:
--   gpt-5.4-mini     -> deepseek-v4-flash-vision-exp
--   gemini-3.7-flash -> gemini-3.8-flash
-- Mirrored client-side by TUTOR_MODEL_REPLACEMENTS in src/store/setting.ts.
-- The settings column is JSONB, so we use jsonb_set to update the nested key.

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{tutorModel}', '"deepseek-v4-flash-vision-exp"'::jsonb
    ),
    updated_at = NOW()
WHERE settings->>'tutorModel' = 'gpt-5.4-mini';

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{tutorModel}', '"gemini-3.8-flash"'::jsonb
    ),
    updated_at = NOW()
WHERE settings->>'tutorModel' = 'gemini-3.7-flash';

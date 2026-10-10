-- Force the Vision Model (visionModel) and the Language Check OCR Model
-- (ocrModel) to the new default "gpt-6-luna" for ALL users, regardless of
-- their current selection. ocrModel was introduced defaulting to
-- "gpt-5.6-luna"; both defaults now live in defaultValues in
-- src/store/setting.ts.
--
-- Authenticated users load settings from user_settings.settings (JSONB) on
-- each sign-in, so a SQL migration is the only way to move them onto the new
-- default. Unconditional, mirroring migrate-vision-model-default.sql (the
-- rollout requires every existing user to land on the new default, including
-- users who had explicitly kept "gpt-5.6-luna", which stays valid in
-- VISION_MODELS / OCR_MODELS). Rows where the key is absent need no update:
-- the app then falls back to defaultValues ("gpt-6-luna") anyway.
--
-- Idempotent: re-running is a no-op for users already on the new default.

UPDATE user_settings
SET settings = jsonb_set(settings, '{visionModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

UPDATE user_settings
SET settings = jsonb_set(settings, '{ocrModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

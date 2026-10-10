-- 1. "gpt-5.6-luna" was removed from VISION_MODELS/OCR_MODELS: move any user
--    still on it to "gpt-6-luna" (the Vision Model default).
-- 2. ocrModel's default is now "claude-haiku-5-5" (defaultValues in
--    src/store/setting.ts) and "claude-sonnet-5-5" was removed from
--    OCR_MODELS, so every existing user is moved onto the new default
--    unconditionally — this also covers users on the old default
--    ("gpt-5.6-luna" or "gpt-6-luna").
--
-- Supersedes scripts/migrate-vision-ocr-default-gpt-6-luna.sql (which had
-- forced both fields to "gpt-6-luna"). Authenticated users load settings
-- from user_settings.settings (JSONB) on each sign-in, so a SQL migration is
-- the only way to move them; validateSettings additionally resets any value
-- that is no longer in the lists, so a missed row self-heals client-side.
-- Idempotent: re-running is a no-op.

UPDATE user_settings
SET settings = jsonb_set(settings, '{visionModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'visionModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{ocrModel}', '"claude-haiku-5-5"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

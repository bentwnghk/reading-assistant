-- The AI Tutor Model (tutorModel) default is now "gpt-6-luna" (defaultValues
-- in src/store/setting.ts), and "claude-haiku-5-5" was added to TUTOR_MODELS.
--
-- Authenticated users load settings from user_settings.settings (JSONB) on
-- each sign-in, so a SQL migration is the only way to move them onto the new
-- default. Unconditional, mirroring
-- scripts/migrate-vision-ocr-default-gpt-6-luna.sql: the rollout requires
-- every existing user to land on the new default, including users who had
-- explicitly kept the old default ("step-3.7-flash", which stays valid in
-- TUTOR_MODELS so users may still switch back to it). Rows where the key is
-- absent need no update: the app then falls back to defaultValues
-- ("gpt-6-luna") anyway.
--
-- Idempotent: re-running is a no-op for users already on the new default.

UPDATE user_settings
SET settings = jsonb_set(settings, '{tutorModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

-- The Language Check Model (languageCheckModel) default is now
-- "claude-sonnet-5-5" (defaultValues in src/store/setting.ts), and the field
-- was removed from RESTRICTED_MODEL_FIELD_NAMES so every user — not just
-- admins/super-admins/meter-billing — can pick it in the Settings dialog
-- (same policy as ocrModel). "gpt-6.1-sol" stays valid in
-- READING_TEXT_MODELS, so users may still switch back to it.
--
-- Authenticated users load settings from user_settings.settings (JSONB) on
-- each sign-in, so a SQL migration is the only way to move them onto the new
-- default. Unconditional, mirroring
-- scripts/migrate-vision-ocr-default-gpt-6-luna.sql: the rollout requires
-- every existing user to land on the new default, including users who had
-- explicitly kept the old default ("gpt-6.1-sol"). Rows where the key is
-- absent need no update: the app then falls back to defaultValues
-- ("claude-sonnet-5-5") anyway.
--
-- Idempotent: re-running is a no-op for users already on the new default.

UPDATE user_settings
SET settings = jsonb_set(settings, '{languageCheckModel}', '"claude-sonnet-5-5"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

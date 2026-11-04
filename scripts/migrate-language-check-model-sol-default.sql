-- The Grammar Check Model (languageCheckModel) default is now "gpt-6.1-sol"
-- (defaultValues in src/store/setting.ts), "gpt-6.1-terra" joined
-- READING_TEXT_MODELS, and the field was ADDED to RESTRICTED_MODEL_FIELD_NAMES:
-- claude-sonnet-5-5 (and gemini-3.8-flash) are now admin/super-admin/
-- meter-billing only, like every other restricted model.
--
-- Unconditional, mirroring scripts/migrate-language-check-model-sonnet-default.sql:
-- the rollout requires every existing user to land on the new default,
-- including users who had explicitly kept the old default
-- ("claude-sonnet-5-5") or picked another model. This simultaneously strips
-- claude-sonnet-5-5 from non-privileged users (the restriction); admins,
-- super-admins and meter-billing users may re-select it in Settings, where
-- it stays visible. Rows where the key is absent need no update: the app
-- falls back to defaultValues ("gpt-6.1-sol") anyway, and the client-side
-- enforceRestrictedModels() run on sign-in / Settings open self-heals any
-- missed row.
--
-- Idempotent: re-running is a no-op for users already on the new default.

UPDATE user_settings
SET settings = jsonb_set(settings, '{languageCheckModel}', '"gpt-6.1-sol"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

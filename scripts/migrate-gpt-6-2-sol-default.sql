-- The Reading Text Generator Model (readingTextModel) and the Writing
-- Assessment Model (languageCheckModel) defaults are now "gpt-6.2-sol"
-- (defaultValues in src/store/setting.ts), and "gpt-6.2-sol" joins
-- READING_TEXT_MODELS, the list feeding both Settings dropdowns.
--
-- Unconditional, mirroring scripts/migrate-language-check-model-sol-default.sql:
-- the rollout requires every existing user to land on the new defaults,
-- including users who had explicitly kept an old default
-- ("deepseek-flash" for readingTextModel, "gpt-6.1-sol" for
-- languageCheckModel) or picked another model. The old ids stay valid in
-- READING_TEXT_MODELS, so users may still switch back in Settings.
-- Rows where a key is absent need no update: the app falls back to
-- defaultValues ("gpt-6.2-sol") anyway.
--
-- Idempotent: re-running is a no-op for users already on the new defaults.

UPDATE user_settings
SET settings = jsonb_set(
        jsonb_set(settings, '{readingTextModel}', '"gpt-6.2-sol"'::jsonb),
        '{languageCheckModel}', '"gpt-6.2-sol"'::jsonb),
    updated_at = NOW()
WHERE settings IS NOT NULL;

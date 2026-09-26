-- Force the vision model setting to the new default "gpt-5.6-luna" for ALL
-- users, regardless of their current selection (including "gpt-5-nano", which
-- was retired from VISION_MODELS in src/store/setting.ts).
--
-- Authenticated users load settings from user_settings.settings (JSONB) on
-- each sign-in, so a SQL migration is the only way to move them off the old
-- default. Idempotent: re-running is a no-op for users already on the new
-- default.

UPDATE user_settings
SET settings = jsonb_set(settings, '{visionModel}', '"gpt-5.6-luna"'::jsonb),
    updated_at = NOW();

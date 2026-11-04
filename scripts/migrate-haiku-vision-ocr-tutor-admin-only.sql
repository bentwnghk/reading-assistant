-- claude-haiku-5-5 is now a RESTRICTED model for the Vision (OCR) Model
-- (visionModel), the Grammar Check OCR Model (ocrModel) and the AI Tutor
-- Model (tutorModel): only admins/super-admins and meter-billing
-- (mode "local") users may select it (RESTRICTED_VISION_MODELS /
-- RESTRICTED_TUTOR_MODELS in src/store/setting.ts). The default for everyone
-- else is "gpt-6-luna", so existing non-privileged users currently on
-- claude-haiku-5-5 are moved onto it. Admins, super-admins and
-- meter-billing users keep their selection.
--
-- Authenticated users load settings from user_settings.settings (JSONB) on
-- each sign-in, so a SQL migration is the only reliable way to move them;
-- the client-side enforceRestrictedModels() run on sign-in / Settings open
-- provides a runtime backstop that self-heals a missed row. Roles live in
-- the user_roles TABLE (there is no users.role column); users without a row
-- default to "student" (COALESCE). Rows whose stored mode is "local" are
-- meter-billing users and stay exempt, matching isPrivileged in
-- enforceRestrictedModels().
--
-- Idempotent: re-running is a no-op (rows already on "gpt-6-luna" no longer
-- match the WHERE clause).

UPDATE user_settings us
SET settings = jsonb_set(us.settings, '{visionModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE us.user_id = u.id
  AND COALESCE(ur.role, 'student') NOT IN ('admin', 'super-admin')
  AND COALESCE(us.settings->>'mode', '') <> 'local'
  AND us.settings->>'visionModel' = 'claude-haiku-5-5';

UPDATE user_settings us
SET settings = jsonb_set(us.settings, '{ocrModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE us.user_id = u.id
  AND COALESCE(ur.role, 'student') NOT IN ('admin', 'super-admin')
  AND COALESCE(us.settings->>'mode', '') <> 'local'
  AND us.settings->>'ocrModel' = 'claude-haiku-5-5';

UPDATE user_settings us
SET settings = jsonb_set(us.settings, '{tutorModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE us.user_id = u.id
  AND COALESCE(ur.role, 'student') NOT IN ('admin', 'super-admin')
  AND COALESCE(us.settings->>'mode', '') <> 'local'
  AND us.settings->>'tutorModel' = 'claude-haiku-5-5';

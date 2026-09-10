-- Rename DeepSeek model ids to "deepseek-flash" across every model setting
-- in user_settings (summaryModel, tutorModel, basicTutorModel, ...):
--   deepseek-v4-flash            -> deepseek-flash
--   deepseek-v4-flash-vision-exp -> deepseek-flash
-- Rebuilds the JSONB settings object key-by-key so no model field is missed.
-- Mirrored client-side by RENAMED_MODELS in src/store/setting.ts.

UPDATE user_settings AS u
SET settings = (
      SELECT jsonb_object_agg(
               e.key,
               CASE
                 WHEN e.value IN ('"deepseek-v4-flash"'::jsonb,
                                  '"deepseek-v4-flash-vision-exp"'::jsonb)
                   THEN '"deepseek-flash"'::jsonb
                 ELSE e.value
               END
             )
      FROM jsonb_each(u.settings) AS e
    ),
    updated_at = NOW()
WHERE u.settings::text LIKE '%deepseek-v4-flash%';

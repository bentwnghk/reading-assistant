-- Force-apply the new default Advanced AI Tutor Model ("step-3.7-flash") to ALL users,
-- overriding any previously persisted tutorModel selection.
-- The settings column is JSONB, so we use jsonb_set to update the nested key.

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{tutorModel}', '"step-3.7-flash"'::jsonb
    ),
    updated_at = NOW();

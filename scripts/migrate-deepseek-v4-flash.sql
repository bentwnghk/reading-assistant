-- Migrate all model fields from "deepseek-chat" to "deepseek-v4-flash" in user_settings.
-- The settings column is JSONB, so we use jsonb_set to update the nested keys.

UPDATE user_settings
SET settings =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                settings,
                '{summaryModel}', '"deepseek-v4-flash"'::jsonb
              ),
              '{mindMapModel}', '"deepseek-v4-flash"'::jsonb
            ),
            '{adaptedTextModel}', '"deepseek-v4-flash"'::jsonb
          ),
          '{simplifyModel}', '"deepseek-v4-flash"'::jsonb
        ),
        '{glossaryModel}', '"deepseek-v4-flash"'::jsonb
      ),
      '{sentenceAnalysisModel}', '"deepseek-v4-flash"'::jsonb
    ),
  updated_at = NOW()
WHERE settings->>'summaryModel' = 'deepseek-chat'
   OR settings->>'mindMapModel' = 'deepseek-chat'
   OR settings->>'adaptedTextModel' = 'deepseek-chat'
   OR settings->>'simplifyModel' = 'deepseek-chat'
   OR settings->>'glossaryModel' = 'deepseek-chat'
   OR settings->>'sentenceAnalysisModel' = 'deepseek-chat';

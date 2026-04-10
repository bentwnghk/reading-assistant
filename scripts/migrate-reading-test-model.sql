-- Migrate all model fields from "gpt-5-mini" to "gpt-5.4-mini" or "deepseek-chat" in user_settings.
-- The settings column is JSONB, so we use jsonb_set to update the nested keys.

UPDATE user_settings
SET settings =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    settings,
                    '{readingTestModel}', '"gpt-5.4-mini"'::jsonb
                  ),
                  '{tutorModel}', '"gpt-5.4-mini"'::jsonb
                ),
                '{summaryModel}', '"deepseek-chat"'::jsonb
              ),
              '{mindMapModel}', '"deepseek-chat"'::jsonb
            ),
            '{adaptedTextModel}', '"deepseek-chat"'::jsonb
          ),
          '{simplifyModel}', '"deepseek-chat"'::jsonb
        ),
        '{glossaryModel}', '"deepseek-chat"'::jsonb
      ),
      '{sentenceAnalysisModel}', '"deepseek-chat"'::jsonb
    ),
  updated_at = NOW()
WHERE settings->>'readingTestModel' = 'gpt-5-mini'
   OR settings->>'tutorModel' = 'gpt-5-mini'
   OR settings->>'summaryModel' = 'gpt-5-mini'
   OR settings->>'mindMapModel' = 'gpt-5-mini'
   OR settings->>'adaptedTextModel' = 'gpt-5-mini'
   OR settings->>'simplifyModel' = 'gpt-5-mini'
   OR settings->>'glossaryModel' = 'gpt-5-mini'
   OR settings->>'sentenceAnalysisModel' = 'gpt-5-mini';

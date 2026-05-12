-- Reset all 10 AI model settings to their default values in user_settings.
-- The settings column is JSONB, so we use jsonb_set to update the nested keys.
-- This affects ALL users regardless of their current model selections.
--
-- Defaults (from src/store/setting.ts):
--   visionModel           -> gpt-5-nano
--   summaryModel          -> deepseek-v4-flash
--   mindMapModel           -> deepseek-v4-flash
--   adaptedTextModel       -> deepseek-v4-flash
--   simplifyModel          -> deepseek-v4-flash
--   readingTestModel       -> deepseek-v4-flash
--   glossaryModel          -> deepseek-v4-flash
--   sentenceAnalysisModel  -> deepseek-v4-flash
--   grammarModel           -> deepseek-v4-flash
--   tutorModel             -> gpt-5.4-mini

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
                    jsonb_set(
                      jsonb_set(
                        settings,
                        '{visionModel}', '"gpt-5-nano"'::jsonb
                      ),
                      '{summaryModel}', '"deepseek-v4-flash"'::jsonb
                    ),
                    '{mindMapModel}', '"deepseek-v4-flash"'::jsonb
                  ),
                  '{adaptedTextModel}', '"deepseek-v4-flash"'::jsonb
                ),
                '{simplifyModel}', '"deepseek-v4-flash"'::jsonb
              ),
              '{readingTestModel}', '"deepseek-v4-flash"'::jsonb
            ),
            '{glossaryModel}', '"deepseek-v4-flash"'::jsonb
          ),
          '{sentenceAnalysisModel}', '"deepseek-v4-flash"'::jsonb
        ),
        '{grammarModel}', '"deepseek-v4-flash"'::jsonb
      ),
      '{tutorModel}', '"gpt-5.4-mini"'::jsonb
    ),
  updated_at = NOW();

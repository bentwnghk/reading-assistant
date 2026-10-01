-- Rename "gpt-5.6-luna" -> "gpt-6-luna" in AVAILABLE_MODELS. Applies to the
-- 11 general model fields ONLY — the Vision Model setting (visionModel) keeps
-- "gpt-5.6-luna", which remains valid in VISION_MODELS.
-- Mirrored client-side by RENAMED_MODELS in src/store/setting.ts (which does
-- not include visionModel in its rename pass).

UPDATE user_settings
SET settings = jsonb_set(settings, '{prereadingModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'prereadingModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{summaryModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'summaryModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{mindMapModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'mindMapModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{adaptedTextModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'adaptedTextModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{simplifyModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'simplifyModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{readingTestModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'readingTestModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{glossaryModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'glossaryModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{suggestVocabModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'suggestVocabModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{sentenceAnalysisModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'sentenceAnalysisModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{collocationModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'collocationModel' = 'gpt-5.6-luna';

UPDATE user_settings
SET settings = jsonb_set(settings, '{grammarModel}', '"gpt-6-luna"'::jsonb),
    updated_at = NOW()
WHERE settings->>'grammarModel' = 'gpt-5.6-luna';

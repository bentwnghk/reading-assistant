-- Migrate the retired model "gpt-5.4-nano" to "gpt-5.6-luna" across ALL model
-- fields in user_settings.settings.
--
-- "gpt-5.4-nano" was a valid value in three model lists (AVAILABLE_MODELS,
-- VISION_MODELS, BASIC_TUTOR_MODELS), so it may be persisted in any of these
-- JSON keys: summaryModel, mindMapModel, adaptedTextModel, simplifyModel,
-- readingTestModel, glossaryModel, sentenceAnalysisModel, grammarModel,
-- visionModel, basicTutorModel.
--
-- Rather than enumerate each key (10 nested jsonb_set calls), we do a
-- field-agnostic replacement on the JSONB text. This is safe because the
-- quoted token "gpt-5.4-nano" can only appear as a discrete string value
-- (never as a key, and never as a substring of another model name), so it is
-- unambiguous. The WHERE clause limits the scan and keeps the update idempotent.

UPDATE user_settings
SET settings =
    REPLACE(settings::text, '"gpt-5.4-nano"', '"gpt-5.6-luna"')::jsonb,
    updated_at = NOW()
WHERE settings::text LIKE '%"gpt-5.4-nano"%';

-- Rename the Gemini TTS model id "gemini-3.1-flash-tts-preview" to
-- "gemini-3.8-flash-lite-tts" for ALL existing users who had it selected.
-- The voice catalog is UNCHANGED (enceladus/kore/puck/aoede/orus/gacrux), so
-- ttsVoice needs no rewrite — a voice saved for the old id is valid for the
-- new one (sanitizeModelSettings/getEffectiveTtsVoice confirm the pair).
--
-- Unlike migrate-tts-default-gemini-kore.sql (unconditional — it forced new
-- DEFAULTS on everyone), this migration is deliberately TARGETED: only rows
-- actually holding the retired id are rewritten, so users on tts-1 or
-- x-ai/grok-voice-tts-1.0 keep their model untouched. Without this migration
-- those users would instead be reset to the default Grok model by
-- sanitizeModelSettings (the retired id is no longer in TTS_MODELS).
--
-- ttsVoiceByModel: the per-model voice memory entry saved under the retired
-- id is re-keyed to the new id (preserving its value) so a later model switch
-- in the Settings dialog (which restores voices via getSavedTtsVoiceFor)
-- still finds the remembered voice. The re-key runs for every row that has
-- the legacy key, regardless of the currently active ttsModel. Idempotent:
-- re-running is a no-op (the WHERE clauses no longer match).
--
-- Client-side mirror: TTS_MODEL_REPLACEMENTS in src/store/setting.ts covers
-- stale localStorage / not-yet-migrated user_settings rows on load.

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{ttsModel}', '"gemini-3.8-flash-lite-tts"'::jsonb
    )
WHERE settings IS NOT NULL
  AND settings->>'ttsModel' = 'gemini-3.1-flash-tts-preview';

UPDATE user_settings
SET settings =
    jsonb_set(
      settings #- '{ttsVoiceByModel,gemini-3.1-flash-tts-preview}',
      '{ttsVoiceByModel,gemini-3.8-flash-lite-tts}',
      settings->'ttsVoiceByModel'->'gemini-3.1-flash-tts-preview'
    )
WHERE settings IS NOT NULL
  AND settings->'ttsVoiceByModel' ? 'gemini-3.1-flash-tts-preview';

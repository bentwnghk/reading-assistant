-- Reset the default TTS model/voice to "gemini-3.1-flash-tts-preview" + "kore"
-- for ALL existing users, regardless of their currently saved model and voice.
--
-- Unlike migrate-tts-voice-onyx.sql (which was deliberately targeted with a
-- WHERE clause to preserve explicit voice selections), this migration is
-- intentionally UNCONDITIONAL: the rollout requires every existing user to
-- land on the new defaults, overriding whatever model/voice they had.
--
-- ttsVoiceByModel: the per-model voice memory's entry for the Gemini model is
-- also forced to "kore" so a later model switch in the Settings dialog (which
-- restores voices via getSavedTtsVoiceFor) cannot resurrect a pre-migration
-- voice. If a row's settings JSONB has no ttsVoiceByModel key, this nested
-- jsonb_set is a no-op (intermediate path steps must exist) — that is safe,
-- because sanitizeModelSettings then seeds the map from the forced ttsVoice,
-- producing the same result. Idempotent: re-running is a no-op.

UPDATE user_settings
SET settings =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          settings,
          '{ttsModel}', '"gemini-3.1-flash-tts-preview"'::jsonb
        ),
        '{ttsVoice}', '"kore"'::jsonb
      ),
      '{ttsVoiceByModel,gemini-3.1-flash-tts-preview}', '"kore"'::jsonb
    )
WHERE settings IS NOT NULL;

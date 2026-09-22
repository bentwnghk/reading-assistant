-- Reset the default TTS model/voice to "x-ai/grok-voice-tts-1.0" + "orion"
-- for ALL existing users, regardless of their currently saved model and voice.
-- Supersedes migrate-tts-default-gemini-kore.sql (same unconditional pattern —
-- the rollout requires every existing user to land on the new defaults).
--
-- ttsVoiceByModel: the per-model voice memory's entry for the Grok model is
-- also forced to "orion" so a later model switch in the Settings dialog (which
-- restores voices via getSavedTtsVoiceFor) cannot resurrect a pre-migration
-- voice (including the pre-v5.74 default "eve"). If a row's settings JSONB has
-- no ttsVoiceByModel key, this nested jsonb_set is a no-op (intermediate path
-- steps must exist) — that is safe, because sanitizeModelSettings then seeds
-- the map from the forced ttsVoice, producing the same result. Selections for
-- OTHER models (e.g. a user's gemini voice) are left untouched, so switching
-- back restores them. Idempotent: re-running is a no-op.

UPDATE user_settings
SET settings =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          settings,
          '{ttsModel}', '"x-ai/grok-voice-tts-1.0"'::jsonb
        ),
        '{ttsVoice}', '"orion"'::jsonb
      ),
      '{ttsVoiceByModel,x-ai/grok-voice-tts-1.0}', '"orion"'::jsonb
    )
WHERE settings IS NOT NULL;

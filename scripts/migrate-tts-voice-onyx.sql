-- Migrate users from the old default TTS voice "alloy" to the new default "onyx".
--
-- Unlike a retired-value migration, "alloy" is still a valid voice
-- (TTS_VOICES = ["alloy","nova","echo","fable","onyx","shimmer"]), so this MUST
-- NOT force every user to "onyx" — that would override explicit selections of
-- nova/echo/fable/shimmer. The WHERE clause limits the change to users still on
-- the old default, preserving any deliberate choice.
--
-- Users whose settings JSONB has no ttsVoice key are untouched: loadFromServer
-- already fills missing keys from defaultValues (now "onyx") at runtime, so they
-- already receive the new default with no migration needed. This keeps the
-- update targeted and idempotent (re-running it is a no-op once no user has alloy).

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{ttsVoice}', '"onyx"'::jsonb
    ),
    updated_at = NOW()
WHERE settings->>'ttsVoice' = 'alloy';

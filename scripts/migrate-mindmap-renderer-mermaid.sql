-- Migrate users from the old default Mind Map renderer "tree" to the new
-- default "mermaid" (the Radial view).
--
-- Both values remain valid (the Mind Map section still exposes a Tree/Radial
-- toggle), so this MUST NOT force every user to "mermaid" — that would
-- override an explicit Tree selection. The WHERE clause limits the change to
-- users still on the old default, preserving any deliberate choice.
--
-- Users whose settings JSONB has no mindMapRenderer key are untouched:
-- loadFromServer fills missing keys from defaultValues (now "mermaid") at
-- runtime, so they already receive the new default with no migration needed.
-- This keeps the update targeted and idempotent (re-running it is a no-op
-- once no user has "tree" stored as a carried-over default).

UPDATE user_settings
SET settings =
    jsonb_set(
      settings,
      '{mindMapRenderer}', '"mermaid"'::jsonb
    ),
    updated_at = NOW()
WHERE settings->>'mindMapRenderer' = 'tree';

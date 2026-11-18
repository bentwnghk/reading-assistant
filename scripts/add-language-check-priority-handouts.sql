-- Writing Assessment: server-side cache of generated priority handouts.
--
-- Student handouts generated from a saved AI assessment report's "Teaching
-- priorities" cards are stored on the report's row (one map per topic per
-- staff member, keyed by the priority's index), so each card can offer
-- "download again" across sessions and devices without a new AI run. The
-- JSONB carries the report snapshot's generatedAt the handouts were built
-- from; both columns are cleared when the report is regenerated
-- (saveAiReport's ON CONFLICT), so a stale handout is never re-downloaded.

ALTER TABLE language_check_topic_ai_reports
  ADD COLUMN IF NOT EXISTS priority_handouts JSONB,
  ADD COLUMN IF NOT EXISTS priority_handouts_generated_at TIMESTAMP WITH TIME ZONE;

-- Writing Assessment: server-side cache of the generated follow-up worksheet.
--
-- The 10 remedial questions generated from a saved AI assessment report are
-- stored on the report's row (one per topic per staff member), so the report
-- page can offer "download again" across sessions and devices without a new
-- AI run. The JSONB carries the report snapshot's generatedAt it was built
-- from; both columns are cleared when the report is regenerated
-- (saveAiReport's ON CONFLICT), so a stale worksheet is never re-downloaded.

ALTER TABLE language_check_topic_ai_reports
  ADD COLUMN IF NOT EXISTS follow_up JSONB,
  ADD COLUMN IF NOT EXISTS follow_up_generated_at TIMESTAMP WITH TIME ZONE;

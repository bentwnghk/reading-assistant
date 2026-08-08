-- scripts/backfill-doc-titles-propagate.sql
--
-- Propagates the refreshed reading_sessions.doc_title (produced by
-- backfill-doc-titles.mjs) into the denormalized title copies across the DB.
--
-- Idempotent: only updates rows whose title column actually differs from the
-- source session, so it is safe to re-run. Run AFTER the AI backfill script.
--
--   psql "$DATABASE_URL" -f scripts/backfill-doc-titles-propagate.sql

BEGIN;

-- 1. shared_sessions: doc_title column + session_data JSONB "docTitle"
UPDATE shared_sessions s
SET doc_title    = rs.doc_title,
    session_data = jsonb_set(s.session_data, '{docTitle}', to_jsonb(rs.doc_title), true)
FROM reading_sessions rs
WHERE s.session_id = rs.id
  AND rs.doc_title <> ''
  AND COALESCE(s.doc_title, '') <> rs.doc_title;

-- 2. assignments: source_doc_title + source_session_snapshot JSONB "docTitle"
UPDATE assignments a
SET source_doc_title       = rs.doc_title,
    source_session_snapshot = jsonb_set(a.source_session_snapshot, '{docTitle}', to_jsonb(rs.doc_title), true)
FROM reading_sessions rs
WHERE a.source_session_id = rs.id
  AND rs.doc_title <> ''
  AND COALESCE(a.source_doc_title, '') <> rs.doc_title;

-- 3. chat_questions: doc_title
UPDATE chat_questions c
SET doc_title = rs.doc_title
FROM reading_sessions rs
WHERE c.session_id = rs.id
  AND rs.doc_title <> ''
  AND COALESCE(c.doc_title, '') <> rs.doc_title;

COMMIT;

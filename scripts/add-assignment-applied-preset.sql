-- ─── Incremental migration: track the preset applied to each assignment ──────
--
-- assignments.applied_preset_id records the saved roster (assignment_presets
-- row) that seeded the assignment at create time. It is the exact,
-- per-teacher relevance link used by the Teacher Dashboard / Student Data
-- class dropdowns: those show only presets referenced by the viewer's own
-- assignments (see getPresetsUsedByUser in src/lib/assignment-presets.ts).
--
-- Soft link, no FK: deleting a preset leaves a dangling id that the join
-- simply treats as "not found".
--
-- Backfill: exact roster set-equality only (no containment heuristics) so
-- historical preset-seeded assignments light up without mislabeling
-- hand-picked rosters. Assignments whose roster was edited after creation,
-- or whose preset has since changed, keep NULL and only become visible in
-- those dropdowns once the teacher creates a new assignment with that
-- preset.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS applied_preset_id TEXT;

UPDATE assignments a
SET applied_preset_id = p.id
FROM assignment_presets p
WHERE p.school_id = (SELECT school_id FROM users WHERE id = a.teacher_id)
  AND a.applied_preset_id IS NULL
  AND (SELECT ARRAY_AGG(s.student_id ORDER BY s.student_id)
       FROM assignment_submissions s WHERE s.assignment_id = a.id)
    = (SELECT ARRAY_AGG(x ORDER BY x)
       FROM jsonb_array_elements_text(p.student_ids) AS x);

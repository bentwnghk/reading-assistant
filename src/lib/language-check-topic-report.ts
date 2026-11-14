import { getPool } from "./db"
import {
  OVERALL_SQL,
  WORD_COUNT_SQL,
  staffEssayConditions,
  sweepExpiredEssays,
  toMs,
  type LanguageCheckStaffScope,
} from "./language-check"
import { visibleClassIds, type TopicViewer } from "./language-check-topics"
import { isExpressionCategory } from "@/constants/languageCheck"
import {
  distributionOf,
  averageOf,
  maxMarksOf,
  schemeOfEssayType,
  summarizeScores,
} from "@/utils/languageCheckTopicReport"

const CLASS_LABEL_SQL = `concat_ws(' · ', g.name, sub.name, c.name)`
const TOPIC_JOINS = `
  LEFT JOIN classes c ON c.id = t.class_id
  LEFT JOIN subjects sub ON sub.id = c.subject_id
  LEFT JOIN grades g ON g.id = c.grade_id
  LEFT JOIN users cu ON cu.id = t.user_id`

/**
 * Topic row (metadata + class roster size). `$VIEWER` marks the viewer-id
 * param slot of the creator-name CASE and must be replaced before use.
 * The roster excludes banned students, matching the pending list in
 * getTopicReport.
 */
const TOPIC_ROW_SQL = `
  SELECT t.id, t.title, t.topic, t.essay_type, t.class_id, t.created_at, t.updated_at,
         (t.question_image <> '') AS has_image,
         ${CLASS_LABEL_SQL} AS class_name,
         CASE WHEN t.user_id = $VIEWER THEN '' ELSE COALESCE(cu.name, '') END AS creator_name,
         (SELECT COUNT(*)::int FROM class_members m JOIN users mu ON mu.id = m.student_id
          WHERE m.class_id = t.class_id AND COALESCE(mu.banned, FALSE) = FALSE) AS student_count
  FROM language_check_topics t ${TOPIC_JOINS}`

/** Saved-assessment sub-score as a number (NULL when absent / not assessed). */
function scoreSql(path: string): string {
  return `CASE WHEN jsonb_typeof(e.assessment) = 'object'
    THEN NULLIF(e.assessment #>> '{${path}}', '')::numeric END`
}
const CONTENT_SQL = scoreSql("content,score")
const ORGANIZATION_SQL = scoreSql("organization,score")
const FEATURES_SQL = scoreSql("features,score")
// Legacy (Language-only) assessments carry the Language mark in `overall`.
const LANGUAGE_SQL = `COALESCE(${scoreSql("languageScore")}, ${scoreSql("overall")})`

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v)
}

/** Appends `extra` to a possibly-empty WHERE fragment. */
function andWhere(where: string, extra: string): string {
  return `${where ? `${where} AND` : "WHERE"} ${extra}`
}

/**
 * Cards for the "Topic reports" tab. The tab mirrors the Student essays
 * tab, so both tally under the same filters:
 *
 *  - one card per LIVE topic that at least one in-scope essay links to
 *    (any status) — exactly the topics the essay log's Topics stat counts;
 *  - checkedCount = checked essay ROWS on the topic (retakes included, any
 *    in-scope writer) — the essay log filtered to topic + checked;
 *  - doneStudents = distinct students of the topic's class with a checked
 *    essay (all distinct students when the topic has no class) — the roster
 *    numerator behind the progress bar and "Fully checked";
 *  - avgOverall / assessedCount average each student's LATEST checked essay,
 *    so a retake cannot drag the class average.
 *
 * checkedEssays totals every in-scope checked essay INCLUDING essays with
 * no topic link (they have no card), so the stat always equals the essay
 * log's checked count.
 */
export async function listTopicReportCards(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  opts: { classId?: string; mineTeacherId?: string },
): Promise<{ topics: LanguageCheckTopicReportCard[]; checkedEssays: number }> {
  await sweepExpiredEssays()

  // Same essay set the "Student essays" tab counts over (scope + the shared
  // class / "My Classes" filters, by WRITER membership).
  const { where, params } = staffEssayConditions(scope, {
    classId: opts.classId,
    mineTeacherId: opts.mineTeacherId,
  })

  const [topicsRes, checkedRes, avgRes, totalRes] = await Promise.all([
    // (A) live topics referenced by ≥1 in-scope essay (any status).
    getPool().query(
      `${TOPIC_ROW_SQL.replace(/\$VIEWER/g, `$${params.length + 1}`)}
       WHERE t.id IN (
         SELECT DISTINCT e.topic_id
         FROM language_check_essays e JOIN users u ON u.id = e.user_id
         ${andWhere(where, "e.topic_id IS NOT NULL")}
       )
       ORDER BY t.updated_at DESC
       LIMIT 500`,
      [...params, viewer.id],
    ),
    // (B) per-topic checked aggregates (row count + distinct students).
    getPool().query(
      `SELECT e.topic_id,
              COUNT(*)::int AS checked,
              COUNT(DISTINCT e.user_id)::int AS done_any,
              COUNT(DISTINCT e.user_id) FILTER (
                WHERE cm.student_id IS NOT NULL AND COALESCE(u.banned, FALSE) = FALSE
              )::int AS done_class
       FROM language_check_essays e
       JOIN users u ON u.id = e.user_id
       JOIN language_check_topics t ON t.id = e.topic_id
       LEFT JOIN class_members cm ON cm.class_id = t.class_id AND cm.student_id = e.user_id
       ${andWhere(where, "e.status = 'checked'")}
       GROUP BY e.topic_id`,
      params,
    ),
    // (C) class average over each student's LATEST checked essay.
    getPool().query(
      `SELECT topic_id,
              COUNT(overall)::int AS assessed,
              ROUND(AVG(overall), 1) AS avg_overall
       FROM (
         SELECT DISTINCT ON (e.topic_id, e.user_id)
                e.topic_id, e.user_id, ${OVERALL_SQL} AS overall
         FROM language_check_essays e JOIN users u ON u.id = e.user_id
         ${andWhere(where, "e.status = 'checked'")}
         ORDER BY e.topic_id, e.user_id, e.updated_at DESC
       ) l
       GROUP BY topic_id`,
      params,
    ),
    // (D) total checked essays behind the stat card (no topic link needed).
    getPool().query(
      `SELECT COUNT(*)::int AS checked_essays
       FROM language_check_essays e JOIN users u ON u.id = e.user_id
       ${andWhere(where, "e.status = 'checked'")}`,
      params,
    ),
  ])

  const checked = new Map(
    checkedRes.rows.map((r: Record<string, unknown>) => [r.topic_id as string, r]),
  )
  const avgs = new Map(
    avgRes.rows.map((r: Record<string, unknown>) => [r.topic_id as string, r]),
  )

  const topics = topicsRes.rows.map(
    (t: Record<string, unknown>): LanguageCheckTopicReportCard => {
      const id = t.id as string
      const classId = (t.class_id as string) || null
      const c = checked.get(id)
      return {
        id,
        title: (t.title as string) || "",
        essayType: t.essay_type as LanguageCheckEssayTypeId,
        classId,
        className: (t.class_name as string) || null,
        creatorName: (t.creator_name as string) || null,
        studentCount: classId ? Number(t.student_count) || 0 : null,
        checkedCount: Number(c?.checked) || 0,
        doneStudents: classId
          ? Number(c?.done_class) || 0
          : Number(c?.done_any) || 0,
        assessedCount: Number(avgs.get(id)?.assessed) || 0,
        avgOverall: numOrNull(avgs.get(id)?.avg_overall),
        overallMax: maxMarksOf(schemeOfEssayType(t.essay_type as string)).overall,
        createdAt: toMs(t.created_at),
        updatedAt: toMs(t.updated_at),
      }
    },
  )

  return {
    topics,
    checkedEssays: Number(totalRes.rows[0]?.checked_essays) || 0,
  }
}

/** May the viewer read this topic at all? Mirrors the Topic Library rule
 *  (own + class-visible topics). */
async function canViewTopic(viewer: TopicViewer, id: string): Promise<boolean> {
  const vis = await visibleClassIds(viewer, 3)
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM language_check_topics t
     WHERE t.id = $1 AND (t.user_id = $2 OR t.class_id IN (${vis.sql}))`,
    [id, viewer.id, ...vis.params],
  )
  return (rowCount ?? 0) > 0
}

/**
 * Full report for one topic, on the same basis as its card: every in-scope
 * essay on the topic counts (any writer, not just the topic's class), and
 * checkedCount counts essay ROWS. Averages / the per-student table still
 * show each student's best-state essay (checked first, then most recent);
 * `pending` stays a class-roster view.
 *
 * Readable when the viewer can see the topic OR it is already surfaced by
 * an in-scope essay (the report grid lists exactly those topics, and the
 * essays themselves carry the topic snapshot, so nothing new is exposed).
 * Null when the topic does not exist / is not readable.
 */
export async function getTopicReport(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  topicId: string,
): Promise<LanguageCheckTopicReport | null> {
  await sweepExpiredEssays()

  const { rows: topicRows } = await getPool().query(
    `${TOPIC_ROW_SQL.replace(/\$VIEWER/g, "$1")} WHERE t.id = $2`,
    [viewer.id, topicId],
  )
  const t = topicRows[0]
  if (!t) return null

  const classId = (t.class_id as string) || null
  const { where, params } = staffEssayConditions(scope, {})
  const topicParam = `$${params.length + 1}`
  const classParam = `$${params.length + 2}`

  const [countRes, studentsRes] = await Promise.all([
    // Checked aggregates on the card's basis: rows + distinct students.
    getPool().query(
      `SELECT
              COUNT(*) FILTER (WHERE e.status = 'checked')::int AS checked,
              COUNT(DISTINCT e.user_id) FILTER (WHERE e.status = 'checked')::int AS done_any,
              COUNT(DISTINCT e.user_id) FILTER (
                WHERE e.status = 'checked'
                  AND cm.student_id IS NOT NULL
                  AND COALESCE(u.banned, FALSE) = FALSE
              )::int AS done_class
       FROM language_check_essays e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN class_members cm ON cm.class_id = ${classParam} AND cm.student_id = e.user_id
       ${andWhere(where, `e.topic_id = ${topicParam}`)}`,
      [...params, topicId, classId],
    ),
    // One best-state essay per student (checked first, then most recent).
    getPool().query(
      `SELECT DISTINCT ON (e.user_id)
              e.id, e.status, e.updated_at, e.user_id, u.name, u.email,
              jsonb_array_length(e.corrections) AS error_count,
              ${WORD_COUNT_SQL} AS word_count,
              ${OVERALL_SQL} AS overall,
              ${CONTENT_SQL} AS content,
              ${LANGUAGE_SQL} AS language,
              ${ORGANIZATION_SQL} AS organization,
              ${FEATURES_SQL} AS features
       FROM language_check_essays e JOIN users u ON u.id = e.user_id
       ${andWhere(where, `e.topic_id = ${topicParam}`)}
       ORDER BY e.user_id, (e.status = 'checked') DESC, e.updated_at DESC`,
      [...params, topicId],
    ),
  ])

  const all = studentsRes.rows.map((r: Record<string, unknown>) => ({
    essayId: r.id as string,
    userId: r.user_id as string,
    name: (r.name as string) || (r.email as string) || "",
    email: (r.email as string) || "",
    status: r.status as LanguageCheckTopicReportStudent["status"],
    wordCount: Number(r.word_count) || 0,
    errorCount: Number(r.error_count) || 0,
    content: numOrNull(r.content),
    language: numOrNull(r.language),
    organization: numOrNull(r.organization),
    features: numOrNull(r.features),
    overall: numOrNull(r.overall),
    updatedAt: toMs(r.updated_at),
  }))
  const students = all.filter((s) => s.status === "checked")

  // Access gate: with no in-scope essays the topic must at least be
  // viewer-visible (own / class-visible), like the Topic Library.
  if (all.length === 0 && !(await canViewTopic(viewer, topicId))) {
    return null
  }

  const counts = countRes.rows[0] ?? {}
  const checkedCount = Number(counts.checked) || 0
  const doneStudents = classId
    ? Number(counts.done_class) || 0
    : Number(counts.done_any) || 0

  // Class members who have not (yet) got a checked essay on this topic.
  let pending: LanguageCheckTopicReportPending[] = []
  if (classId) {
    const members = await getPool().query(
      `SELECT u.id, u.name, u.email
       FROM class_members m JOIN users u ON u.id = m.student_id
       WHERE m.class_id = $1 AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY u.name`,
      [classId],
    )
    const byUser = new Map(all.map((s) => [s.userId, s]))
    pending = members.rows
      .filter((m: Record<string, unknown>) => byUser.get(m.id as string)?.status !== "checked")
      .map((m: Record<string, unknown>) => {
        const e = byUser.get(m.id as string)
        return {
          userId: m.id as string,
          name: (m.name as string) || (m.email as string) || "",
          email: (m.email as string) || "",
          essayId: e?.essayId ?? null,
          status: (e?.status as "draft" | "transcribed") ?? "none",
        }
      })
  }

  // Most frequent error categories (suggestions are polish, not errors).
  const errRes = await getPool().query(
    `SELECT x->>'category' AS category, COUNT(*)::int AS n
     FROM (
       SELECT DISTINCT ON (e.user_id) e.corrections
       FROM language_check_essays e JOIN users u ON u.id = e.user_id
       ${andWhere(where, `e.topic_id = ${topicParam} AND e.status = 'checked'`)}
       ORDER BY e.user_id, e.updated_at DESC
     ) l, jsonb_array_elements(l.corrections) x
     GROUP BY 1 ORDER BY n DESC`,
    [...params, topicId],
  )
  const commonErrors = errRes.rows
    .filter((r: Record<string, unknown>) => r.category && !isExpressionCategory(r.category as string))
    .slice(0, 5)
    .map((r: Record<string, unknown>) => ({
      category: r.category as string,
      count: Number(r.n) || 0,
    }))

  const max = maxMarksOf(schemeOfEssayType(t.essay_type as string))
  const overalls = students.map((s) => s.overall).filter((v): v is number => v !== null)

  return {
    topic: {
      id: t.id as string,
      title: (t.title as string) || "",
      topic: (t.topic as string) || "",
      essayType: t.essay_type as LanguageCheckEssayTypeId,
      hasQuestionImage: !!t.has_image,
      classId,
      className: (t.class_name as string) || null,
      creatorName: (t.creator_name as string) || null,
      createdAt: toMs(t.created_at),
    },
    max,
    studentCount: classId ? Number(t.student_count) || 0 : null,
    checkedCount,
    doneStudents,
    assessedCount: overalls.length,
    averages: summarizeScores(students),
    avgWords: averageOf(students.map((s) => s.wordCount || null)),
    avgErrors: averageOf(students.map((s) => s.errorCount)),
    highest: overalls.length ? Math.max(...overalls) : null,
    lowest: overalls.length ? Math.min(...overalls) : null,
    distribution: distributionOf(overalls, max.overall),
    commonErrors,
    students,
    pending,
  }
}

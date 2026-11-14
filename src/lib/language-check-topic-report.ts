import { getPool } from "./db"
import {
  OVERALL_SQL,
  WORD_COUNT_SQL,
  scopeConditions,
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

/** Topics the viewer can see (own + class-visible), optionally narrowed by class. */
async function visibleTopicRows(
  viewer: TopicViewer,
  opts: { id?: string; classId?: string; mineTeacherId?: string },
) {
  const params: unknown[] = [viewer.id]
  const scope = await visibleClassIds(viewer, 2)
  params.push(...scope.params)
  const where = [`(t.user_id = $1 OR t.class_id IN (${scope.sql}))`]
  if (opts.id) {
    params.push(opts.id)
    where.push(`t.id = $${params.length}`)
  }
  if (opts.classId) {
    params.push(opts.classId)
    where.push(`t.class_id = $${params.length}`)
  }
  if (opts.mineTeacherId) {
    params.push(opts.mineTeacherId)
    where.push(
      `t.class_id IN (SELECT id FROM classes WHERE teacher_id = $${params.length})`,
    )
  }
  const { rows } = await getPool().query(
    `SELECT t.id, t.title, t.topic, t.essay_type, t.class_id, t.created_at, t.updated_at,
            (t.question_image <> '') AS has_image,
            ${CLASS_LABEL_SQL} AS class_name,
            CASE WHEN t.user_id = $1 THEN '' ELSE COALESCE(cu.name, '') END AS creator_name,
            (SELECT COUNT(*)::int FROM class_members m WHERE m.class_id = t.class_id) AS student_count
     FROM language_check_topics t ${TOPIC_JOINS}
     WHERE ${where.join(" AND ")}
     ORDER BY t.updated_at DESC
     LIMIT 500`,
    params,
  )
  return rows as Record<string, unknown>[]
}

/**
 * Card list for the "Topic reports" tab: every saved topic the staff member
 * can see, with how many class students have a checked essay on it. Counts
 * are per STUDENT (a re-written essay is not counted twice) and only count
 * members of the topic's class; topics without a class count any in-scope
 * student.
 */
export async function listTopicReportCards(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  opts: { classId?: string; mineTeacherId?: string },
): Promise<LanguageCheckTopicReportCard[]> {
  const topics = await visibleTopicRows(viewer, opts)
  if (topics.length === 0) return []

  const sc = scopeConditions(scope)
  const params = [...sc.params, topics.map((t) => t.id)]
  const where = [
    ...sc.clauses,
    `e.status = 'checked'`,
    `e.topic_id = ANY($${params.length}::text[])`,
  ]
  const { rows } = await getPool().query(
    `SELECT topic_id,
            COUNT(*)::int AS checked,
            COUNT(overall)::int AS assessed,
            ROUND(AVG(overall), 1) AS avg_overall
     FROM (
       SELECT DISTINCT ON (e.topic_id, e.user_id)
              e.topic_id, e.user_id, ${OVERALL_SQL} AS overall
       FROM language_check_essays e JOIN users u ON u.id = e.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY e.topic_id, e.user_id, e.updated_at DESC
     ) l
     JOIN language_check_topics t ON t.id = l.topic_id
     WHERE t.class_id IS NULL
        OR l.user_id IN (SELECT student_id FROM class_members WHERE class_id = t.class_id)
     GROUP BY topic_id`,
    params,
  )
  const agg = new Map<string, Record<string, unknown>>(
    rows.map((r: Record<string, unknown>) => [r.topic_id as string, r]),
  )

  return topics.map((t): LanguageCheckTopicReportCard => {
    const a = agg.get(t.id as string)
    return {
      id: t.id as string,
      title: (t.title as string) || "",
      essayType: t.essay_type as LanguageCheckEssayTypeId,
      classId: (t.class_id as string) || null,
      className: (t.class_name as string) || null,
      creatorName: (t.creator_name as string) || null,
      studentCount: t.class_id ? Number(t.student_count) || 0 : null,
      checkedCount: Number(a?.checked) || 0,
      assessedCount: Number(a?.assessed) || 0,
      avgOverall: numOrNull(a?.avg_overall),
      overallMax: maxMarksOf(schemeOfEssayType(t.essay_type as string)).overall,
      createdAt: toMs(t.created_at),
      updatedAt: toMs(t.updated_at),
    }
  })
}

/**
 * Full report for one topic: class averages, score distribution, common
 * error categories and one entry per student (their best-state essay on the
 * topic: checked first, then most recent). Null when the topic is not
 * visible to the viewer.
 */
export async function getTopicReport(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  topicId: string,
): Promise<LanguageCheckTopicReport | null> {
  const [t] = await visibleTopicRows(viewer, { id: topicId })
  if (!t) return null

  const sc = scopeConditions(scope)
  const params = [...sc.params, topicId]
  const where = [...sc.clauses, `e.topic_id = $${params.length}`]
  const classId = (t.class_id as string) || null
  let classFilter = ""
  if (classId) {
    params.push(classId)
    classFilter = `AND e.user_id IN (SELECT student_id FROM class_members WHERE class_id = $${params.length})`
  }

  const { rows } = await getPool().query(
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
     WHERE ${where.join(" AND ")} ${classFilter}
     ORDER BY e.user_id, (e.status = 'checked') DESC, e.updated_at DESC`,
    params,
  )

  const all = rows.map((r: Record<string, unknown>) => ({
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
       WHERE ${where.join(" AND ")} ${classFilter} AND e.status = 'checked'
       ORDER BY e.user_id, e.updated_at DESC
     ) l, jsonb_array_elements(l.corrections) x
     GROUP BY 1 ORDER BY n DESC`,
    params,
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
    checkedCount: students.length,
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

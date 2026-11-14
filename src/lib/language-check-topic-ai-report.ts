import { getPool } from "./db"
import { toMs, sweepExpiredEssays, staffEssayConditions, type LanguageCheckStaffScope } from "./language-check"
import type { TopicViewer } from "./language-check-topics"
import { getTopicReport } from "./language-check-topic-report"
import { isExpressionCategory } from "@/constants/languageCheck"
import { contextAround } from "@/utils/languageCheck"

const MAX_EXAMPLES = 4
const MAX_NOTES = 25
const MAX_EXAMPLE_CHARS = 90
const MAX_CONTEXT_SIDE = 120

const CRITERIA = ["content", "language", "organization", "features"] as const

function strings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (x && typeof x === "object" ? String((x as { en?: unknown }).en ?? "") : ""))
    .filter(Boolean)
}

/**
 * Anonymous, aggregated evidence for the AI report: the corrections and
 * assessment notes from each student's LATEST checked essay on the topic
 * (same basis as the report's averages). Null = topic unreadable.
 */
export async function getTopicAiEvidence(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  topicId: string,
): Promise<LanguageCheckAiEvidence | null> {
  const report = await getTopicReport(scope, viewer, topicId)
  if (!report) return null
  await sweepExpiredEssays()

  const { where, params } = staffEssayConditions(scope, {})
  const { rows } = await getPool().query(
    `SELECT DISTINCT ON (e.user_id) e.user_id, e.corrections, e.assessment, e.checked_text
     FROM language_check_essays e JOIN users u ON u.id = e.user_id
     ${where ? `${where} AND` : "WHERE"} e.topic_id = $${params.length + 1} AND e.status = 'checked'
     ORDER BY e.user_id, e.updated_at DESC`,
    [...params, topicId],
  )

  const cats = new Map<
    string,
    { count: number; students: Set<string>; pool: LanguageCheckAiCategoryEvidence["examples"][] }
  >()
  const notes = Object.fromEntries(
    CRITERIA.map((k) => [k, { strengths: [] as string[], weaknesses: [] as string[] }]),
  ) as LanguageCheckAiEvidence["notes"]

  for (const r of rows as Record<string, unknown>[]) {
    const uid = r.user_id as string
    const corrections = Array.isArray(r.corrections) ? (r.corrections as LanguageCheckError[]) : []
    const checkedText = typeof r.checked_text === "string" ? r.checked_text : ""
    const mine = new Map<string, LanguageCheckAiCategoryEvidence["examples"]>()
    for (const c of corrections) {
      if (!c?.category) continue
      const entry = cats.get(c.category) ?? { count: 0, students: new Set<string>(), pool: [] }
      entry.count += 1
      entry.students.add(uid)
      cats.set(c.category, entry)
      if (c.original && c.original.length <= MAX_EXAMPLE_CHARS && c.correction !== c.original) {
        const list = mine.get(c.category) ?? []
        const ctx =
          checkedText && checkedText.slice(c.start, c.end) === c.original
            ? contextAround(checkedText, c.start, c.end, MAX_CONTEXT_SIDE)
            : null
        list.push({
          before: ctx?.before ?? "",
          after: ctx?.after ?? "",
          original: c.original,
          correction: c.correction ?? "",
          explanation: c.explanation ?? "",
          explanationZh: c.explanationZh ?? "",
        })
        mine.set(c.category, list)
      }
    }
    // One example per student per category in the pool, so the picks are spread out.
    for (const [cat, list] of mine) cats.get(cat)!.pool.push(list)

    const a = r.assessment as Record<string, unknown> | null
    if (a && typeof a === "object") {
      const blocks: Record<LanguageCheckAiCriterionKey, unknown> = {
        content: a.content,
        language: a,
        organization: a.organization,
        features: a.features,
      }
      for (const k of CRITERIA) {
        const b = blocks[k] as { strengths?: unknown; weaknesses?: unknown } | undefined
        if (!b) continue
        notes[k].strengths.push(...strings(b.strengths))
        notes[k].weaknesses.push(...strings(b.weaknesses))
      }
    }
  }
  for (const k of CRITERIA) {
    notes[k].strengths = notes[k].strengths.slice(0, MAX_NOTES)
    notes[k].weaknesses = notes[k].weaknesses.slice(0, MAX_NOTES)
  }

  const categories: LanguageCheckAiCategoryEvidence[] = [...cats.entries()]
    .map(([category, v]) => ({
      category,
      expression: isExpressionCategory(category),
      count: v.count,
      students: v.students.size,
      examples: v.pool
        .map((list) => list[0])
        .filter(Boolean)
        .slice(0, MAX_EXAMPLES),
    }))
    .sort((a, b) => b.students - a.students || b.count - a.count)

  return { studentsAnalysed: rows.length, categories, notes }
}

export async function getSavedAiReport(
  topicId: string,
  userId: string,
): Promise<{ report: LanguageCheckAiReport; generatedAt: number } | null> {
  const { rows } = await getPool().query(
    `SELECT report, generated_at FROM language_check_topic_ai_reports
     WHERE topic_id = $1 AND user_id = $2`,
    [topicId, userId],
  )
  if (!rows[0]) return null
  return { report: rows[0].report as LanguageCheckAiReport, generatedAt: toMs(rows[0].generated_at) }
}

export async function saveAiReport(
  topicId: string,
  userId: string,
  report: LanguageCheckAiReport,
): Promise<void> {
  await getPool().query(
    `INSERT INTO language_check_topic_ai_reports (topic_id, user_id, report, essay_count, model, generated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, now())
     ON CONFLICT (topic_id, user_id) DO UPDATE
       SET report = EXCLUDED.report, essay_count = EXCLUDED.essay_count,
           model = EXCLUDED.model, generated_at = now()`,
    [topicId, userId, JSON.stringify(report), report.essayCount, report.model],
  )
}

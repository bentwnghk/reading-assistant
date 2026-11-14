import { getPool } from "./db"
import { getSchoolForUser } from "./users"
import { getTopic, type TopicViewer } from "./language-check-topics"
import { countWords } from "@/utils/languageCheck"
import {
  LANGUAGE_CHECK_DRAFT_RETENTION_DAYS,
  LANGUAGE_CHECK_MAX_ESSAYS,
  LANGUAGE_CHECK_RETENTION_DAYS,
  type LanguageCheckStatus,
} from "@/constants/languageCheck"

export function toMs(value: unknown): number {
  return value ? new Date(value as string).getTime() : 0
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * Word count computed on read from the transcript. Mirrors `countWords()`
 * (src/utils/languageCheck.ts): whitespace-delimited words, 0 for empty text.
 * The lightweight lists never select the transcript payload, so the figure is
 * derived in SQL exactly like page_count / error_count.
 */
/** Saved Language (L) assessment overall (NULL when not assessed / malformed). */
export const OVERALL_SQL = `CASE WHEN jsonb_typeof(e.assessment) = 'object'
     THEN (e.assessment->>'overall')::int END`

export const WORD_COUNT_SQL = `CASE WHEN btrim(e.transcript) = '' THEN 0
     ELSE array_length(regexp_split_to_array(btrim(e.transcript), '\\s+'), 1) END`

function mapSummary(row: Record<string, unknown>): LanguageCheckEssaySummary {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    status: row.status as LanguageCheckEssaySummary["status"],
    pageCount: Number(row.page_count) || 0,
    errorCount: Number(row.error_count) || 0,
    overall: row.overall === null || row.overall === undefined ? null : Number(row.overall),
    wordCount: Number(row.word_count) || 0,
    ownerId: (row.owner_id as string) || (row.user_id as string) || "",
    ownerName: (row.owner_name as string) || "",
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

function mapEssay(row: Record<string, unknown>): LanguageCheckEssay {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    images: arrayOf<string>(row.images),
    transcript: (row.transcript as string) || "",
    status: row.status as LanguageCheckEssay["status"],
    checkedText: (row.checked_text as string) || "",
    corrections: arrayOf<LanguageCheckError>(row.corrections),
    ocrModel: (row.ocr_model as string) || "",
    checkModel: (row.check_model as string) || "",
    droppedCount: Number(row.dropped_count) || 0,
    assessment: (row.assessment as LanguageCheckAssessment | null) ?? null,
    enhanced: (row.enhanced as LanguageCheckEnhanced | null) ?? null,
    topic: (row.topic as string) || "",
    essayType: ((row.essay_type as string) || "") as LanguageCheckEssay["essayType"],
    questionImage: (row.question_image as string) || "",
    ownerId: (row.owner_id as string) || (row.user_id as string) || "",
    ownerName: (row.owner_name as string) || "",
    ownerEmail: (row.owner_email as string) || "",
    ownerClassName: (row.owner_class_name as string) || "",
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

/**
 * Retention sweep. After the retention window:
 * - essays that were never checked (`status <> 'checked'`) are deleted
 *   entirely — there are no corrections to review and the scans dominate
 *   storage;
 * - checked essays keep their record (transcript, corrections, models) for
 *   student review and staff tracking, but have their scans purged.
 * Dead drafts go sooner (LANGUAGE_CHECK_DRAFT_RETENTION_DAYS): a `draft`
 * essay with an empty transcript is pure storage — multi-MB scans, no
 * recoverable work (OCR never produced text, e.g. blocked at an access
 * gate). Drafts with a typed transcript keep the full window.
 * Runs opportunistically (list/count/staff-list). Note: `updated_at` is
 * deliberately untouched — it orders the list and a purge must not bump
 * old essays to the top.
 */
export async function sweepExpiredEssays(): Promise<void> {
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE created_at < now() - make_interval(days => $1)
       AND status <> 'checked'`,
    [LANGUAGE_CHECK_RETENTION_DAYS],
  )
  await getPool().query(
    `UPDATE language_check_essays
     SET images = '[]'::jsonb
     WHERE created_at < now() - make_interval(days => $1)
       AND jsonb_array_length(images) > 0`,
    [LANGUAGE_CHECK_RETENTION_DAYS],
  )
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE created_at < now() - make_interval(days => $1)
       AND status = 'draft'
       AND transcript = ''`,
    [LANGUAGE_CHECK_DRAFT_RETENTION_DAYS],
  )
}

/**
 * Lightweight list: never selects images/transcript/corrections payloads.
 * Includes essays the caller uploaded on a student's behalf (uploaded_by) so
 * staff can re-open what they scanned — rows carry the owner's id/name so the
 * UI can attribute them ("For <student>"). For the student owner nothing
 * changes: ownerId is themselves, so the row renders exactly like their own.
 */
export async function listEssays(
  userId: string,
): Promise<LanguageCheckEssaySummary[]> {
  await sweepExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT e.id, e.title, e.status, e.created_at, e.updated_at,
            e.user_id AS owner_id, u.name AS owner_name,
            jsonb_array_length(e.images) AS page_count,
            jsonb_array_length(e.corrections) AS error_count,
            ${OVERALL_SQL} AS overall,
            ${WORD_COUNT_SQL} AS word_count
     FROM language_check_essays e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.user_id = $1 OR e.uploaded_by = $1
     ORDER BY e.updated_at DESC
     LIMIT $2`,
    [userId, LANGUAGE_CHECK_MAX_ESSAYS],
  )
  return rows.map(mapSummary)
}

export async function getEssay(
  userId: string,
  id: string,
): Promise<LanguageCheckEssay | null> {
  // Retention on direct access too (the sweep may not have run, e.g. for an
  // id that only lives in the client-side cache): never-checked essays are
  // deleted, checked ones only have their scans purged, and dead drafts
  // (empty transcript) expire on the shorter draft window. The caller may be
  // the owner OR the staff uploader — both see the same essay.
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE id = $1 AND (user_id = $2 OR uploaded_by = $2)
       AND created_at < now() - make_interval(days => $3)
       AND status <> 'checked'`,
    [id, userId, LANGUAGE_CHECK_RETENTION_DAYS],
  )
  await getPool().query(
    `UPDATE language_check_essays
     SET images = '[]'::jsonb
     WHERE id = $1 AND (user_id = $2 OR uploaded_by = $2)
       AND created_at < now() - make_interval(days => $3)
       AND jsonb_array_length(images) > 0`,
    [id, userId, LANGUAGE_CHECK_RETENTION_DAYS],
  )
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE id = $1 AND (user_id = $2 OR uploaded_by = $2)
       AND created_at < now() - make_interval(days => $3)
       AND status = 'draft'
       AND transcript = ''`,
    [id, userId, LANGUAGE_CHECK_DRAFT_RETENTION_DAYS],
  )
  const { rows } = await getPool().query(
    `SELECT e.*, e.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
            (SELECT string_agg(c.name, ', ' ORDER BY c.name)
             FROM class_members cm JOIN classes c ON c.id = cm.class_id
             WHERE cm.student_id = e.user_id) AS owner_class_name
     FROM language_check_essays e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.id = $1 AND (e.user_id = $2 OR e.uploaded_by = $2)`,
    [id, userId],
  )
  return rows[0] ? mapEssay(rows[0]) : null
}

export async function countEssays(userId: string): Promise<number> {
  await sweepExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM language_check_essays WHERE user_id = $1`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function createEssay(
  data: {
    /** The essay's owner. For teacher uploads this is the STUDENT. */
    userId: string
    /** Staff member who scanned the essay on the owner's behalf. */
    uploadedBy?: string
    title: string
    images: string[]
    ocrModel?: string
    /** Writing-task snapshot from the Topic Library. */
    topicId?: string
    topic?: string
    essayType?: string
    questionImage?: string
  },
): Promise<LanguageCheckEssay> {
  const { rows } = await getPool().query(
    `WITH ins AS (
       INSERT INTO language_check_essays
         (user_id, uploaded_by, title, images, ocr_model,
          topic_id, topic, essay_type, question_image)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       RETURNING *
     )
     SELECT ins.*, ins.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
            (SELECT string_agg(c.name, ', ' ORDER BY c.name)
             FROM class_members cm JOIN classes c ON c.id = cm.class_id
             WHERE cm.student_id = ins.user_id) AS owner_class_name
     FROM ins LEFT JOIN users u ON u.id = ins.user_id`,
    [
      data.userId,
      data.uploadedBy ?? null,
      data.title,
      JSON.stringify(data.images),
      data.ocrModel ?? "",
      data.topicId ?? null,
      data.topic ?? "",
      data.essayType ?? "",
      data.questionImage ?? "",
    ],
  )
  return mapEssay(rows[0])
}

export interface EssayPatch {
  title?: string
  transcript?: string
  status?: LanguageCheckStatus
  checkedText?: string
  corrections?: LanguageCheckError[]
  ocrModel?: string
  checkModel?: string
  droppedCount?: number
  assessment?: LanguageCheckAssessment | null
  enhanced?: LanguageCheckEnhanced | null
}

/** Partial update; only the provided fields are written. */
export async function updateEssay(
  userId: string,
  id: string,
  patch: EssayPatch,
): Promise<boolean> {
  const sets: string[] = []
  const values: unknown[] = []
  const add = (column: string, value: unknown, cast = "") => {
    values.push(value)
    sets.push(`${column} = $${values.length}${cast}`)
  }

  if (patch.title !== undefined) add("title", patch.title)
  if (patch.transcript !== undefined) add("transcript", patch.transcript)
  if (patch.status !== undefined) add("status", patch.status)
  if (patch.checkedText !== undefined) add("checked_text", patch.checkedText)
  if (patch.corrections !== undefined)
    add("corrections", JSON.stringify(patch.corrections), "::jsonb")
  if (patch.ocrModel !== undefined) add("ocr_model", patch.ocrModel)
  if (patch.checkModel !== undefined) add("check_model", patch.checkModel)
  if (patch.droppedCount !== undefined) add("dropped_count", patch.droppedCount)
  if (patch.assessment !== undefined)
    add(
      "assessment",
      patch.assessment === null ? null : JSON.stringify(patch.assessment),
      "::jsonb",
    )
  if (patch.enhanced !== undefined)
    add(
      "enhanced",
      patch.enhanced === null ? null : JSON.stringify(patch.enhanced),
      "::jsonb",
    )

  if (sets.length === 0) return true

  values.push(id, userId)
  const result = await getPool().query(
    `UPDATE language_check_essays SET ${sets.join(", ")}
     WHERE id = $${values.length - 1}
       AND (user_id = $${values.length} OR uploaded_by = $${values.length})`,
    values,
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Does this essay already carry a saved assessment (scoped to the owner /
 * staff uploader)? Students may save the FIRST assessment of an essay but
 * never replace an existing one — an assessed essay is final for them, and
 * only staff (staff-log route, or the owner PATCH as uploader) may
 * re-assess it.
 */
export async function essayHasAssessment(
  userId: string,
  id: string,
): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM language_check_essays
     WHERE id = $1 AND assessment IS NOT NULL
       AND (user_id = $2 OR uploaded_by = $2)`,
    [id, userId],
  )
  return (rowCount ?? 0) > 0
}

/**
 * Does this essay already carry saved enhanced essays (scoped to the owner /
 * staff uploader)? Students may generate the FIRST version but never replace
 * it — only staff (staff-log route, or the owner PATCH as uploader) may
 * regenerate. Same rule as `essayHasAssessment`.
 */
export async function essayHasEnhanced(
  userId: string,
  id: string,
): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM language_check_essays
     WHERE id = $1 AND enhanced IS NOT NULL
       AND (user_id = $2 OR uploaded_by = $2)`,
    [id, userId],
  )
  return (rowCount ?? 0) > 0
}

export async function deleteEssay(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM language_check_essays
     WHERE id = $1 AND (user_id = $2 OR uploaded_by = $2)`,
    [id, userId],
  )
  return (result.rowCount ?? 0) > 0
}

// ─── Staff essay log (teachers / admins / super-admins) ─────────────────────

export type LanguageCheckStaffScope =
  | { kind: "all" }
  | { kind: "school"; schoolId: string }
  | { kind: "teacher"; teacherId: string }

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "teacher" || role === "admin" || role === "super-admin"
}

/**
 * May this staff member scan an essay on the student's behalf? Same scope as
 * the staff views (teacher → students in their classes, admin → school,
 * super-admin → everyone), restricted to current, non-banned student
 * accounts — the target must be a learner, not a colleague. Roles live in
 * user_roles; a user with no row there is implicitly a student.
 */
export async function canUploadForStudent(
  scope: LanguageCheckStaffScope,
  studentId: string,
): Promise<boolean> {
  const clauses = [
    `COALESCE(ur.role, 'student') = 'student'`,
    `COALESCE(u.banned, FALSE) = FALSE`,
  ]
  const params: unknown[] = []
  if (scope.kind === "teacher") {
    params.push(scope.teacherId)
    clauses.push(
      `EXISTS (
        SELECT 1 FROM class_members ucm
        JOIN classes uc ON uc.id = ucm.class_id
        WHERE ucm.student_id = u.id AND uc.teacher_id = $${params.length}
      )`,
    )
  } else if (scope.kind === "school") {
    params.push(scope.schoolId)
    clauses.push(`u.school_id = $${params.length}`)
  }
  params.push(studentId)
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.id = $${params.length} AND ${clauses.join(" AND ")}`,
    params,
  )
  return (rowCount ?? 0) > 0
}

/**
 * Resolve the essay-visibility scope for a staff session:
 * teacher → students in their classes, admin → their school,
 * super-admin → everyone. Returns null for students (no staff access).
 */
export async function resolveStaffScope(
  role: string | null | undefined,
  userId: string,
): Promise<LanguageCheckStaffScope | null> {
  if (role === "super-admin") return { kind: "all" }
  if (role === "admin") {
    const schoolId = await getSchoolForUser(userId)
    return { kind: "school", schoolId: schoolId ?? "" }
  }
  if (role === "teacher") return { kind: "teacher", teacherId: userId }
  return null
}

/**
 * Builds role-scoped WHERE fragments over the aliases used by the staff
 * queries (`e` = language_check_essays, `u` = users). "@" placeholders are
 * replaced with sequential $N params.
 */
export function scopeConditions(
  scope: LanguageCheckStaffScope,
): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  const add = (sql: string, ...values: unknown[]) => {
    let i = 0
    clauses.push(sql.replace(/@/g, () => `$${params.length + 1 + i++}`))
    params.push(...values)
  }
  if (scope.kind === "teacher") {
    add(
      `EXISTS (
        SELECT 1 FROM class_members scm
        JOIN classes sc ON sc.id = scm.class_id
        WHERE scm.student_id = e.user_id AND sc.teacher_id = @
      )`,
      scope.teacherId,
    )
  } else if (scope.kind === "school") {
    add("u.school_id = @", scope.schoolId)
  }
  return { clauses, params }
}

/**
 * WHERE over the staff essay set: staff scope plus the shared filter picks
 * (student / status / topic and the class / "My Classes" filters, which
 * narrow by WRITER membership). The Student essays tab AND the Topic
 * reports tab both build their queries from this one fragment so the two
 * tabs always count over identical rows — their Topics / Checked essays
 * stat cards must tally.
 */
export function staffEssayConditions(
  scope: LanguageCheckStaffScope,
  opts: {
    userId?: string
    status?: string
    topicId?: string
    classId?: string
    mineTeacherId?: string
  },
): { where: string; params: unknown[] } {
  const { clauses, params } = scopeConditions(scope)
  const add = (sql: string, ...values: unknown[]) => {
    let i = 0
    clauses.push(sql.replace(/@/g, () => `$${params.length + 1 + i++}`))
    params.push(...values)
  }
  if (opts.userId) add("e.user_id = @", opts.userId)
  if (opts.status) add("e.status = @", opts.status)
  if (opts.topicId) add("e.topic_id = @", opts.topicId)
  if (opts.classId) {
    add(
      `e.user_id IN (SELECT student_id FROM class_members WHERE class_id = @)`,
      opts.classId,
    )
  }
  if (opts.mineTeacherId) {
    add(
      `e.user_id IN (SELECT mcm.student_id FROM class_members mcm JOIN classes mc ON mc.id = mcm.class_id WHERE mc.teacher_id = @)`,
      opts.mineTeacherId,
    )
  }
  return { where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", params }
}

const STAFF_FROM = `FROM language_check_essays e JOIN users u ON u.id = e.user_id`

/** Sortable columns of the staff essay-log table (§M: derive the API enum
 *  from this list, never retype it). */
export const STAFF_ESSAY_SORT_FIELDS = [
  "updated",
  "student",
  "title",
  "overall",
] as const
export type StaffEssaySortField = (typeof STAFF_ESSAY_SORT_FIELDS)[number]

export const STAFF_ESSAY_SORT_ORDERS = ["asc", "desc"] as const
export type StaffEssaySortOrder = (typeof STAFF_ESSAY_SORT_ORDERS)[number]

/**
 * ORDER BY clause for each sortable column. NULLS LAST keeps not-assessed
 * essays at the end under "Overall" and untitled essays at the end under
 * "Title" in BOTH directions; every sort falls back to recency (+ id) so
 * pagination stays stable.
 */
function staffSortSql(
  sort: StaffEssaySortField,
  order: StaffEssaySortOrder,
): string {
  const dir = order === "asc" ? "ASC" : "DESC"
  switch (sort) {
    case "student":
      return `u.name ${dir}, e.updated_at DESC, e.id DESC`
    case "title":
      return `NULLIF(e.title, '') ${dir} NULLS LAST, e.updated_at DESC, e.id DESC`
    case "overall":
      return `${OVERALL_SQL} ${dir} NULLS LAST, e.updated_at DESC, e.id DESC`
    default:
      return `e.updated_at ${dir}, e.id DESC`
  }
}

/** Lightweight staff list: no images/transcript/corrections payloads. */
export async function listStaffEssays(
  scope: LanguageCheckStaffScope,
  opts: {
    page: number
    pageSize: number
    userId?: string
    status?: LanguageCheckStatus
    /** Writing-topic filter: essays written on this topic only. */
    topicId?: string
    /**
     * Class filter — narrows rows AND stats like the other filters, but is
     * the only filter that also narrows the student options (a class scope
     * implies its students). Intersects with the staff scope (a foreign
     * class's members are not in scope, so nothing leaks).
     */
    classId?: string
    /**
     * "My Classes" — narrows to the students of the classes the CALLER
     * teaches (the class picker's default for admins/super-admins who
     * teach). Same intersection semantics as classId.
     */
    mineTeacherId?: string
    /** Sort column (default: recency). */
    sort?: StaffEssaySortField
    /** Sort direction (default: descending). */
    order?: StaffEssaySortOrder
  },
): Promise<{
  rows: LanguageCheckStaffRow[]
  total: number
  stats: LanguageCheckStaffStats
  users: LanguageCheckStaffUser[]
  topics: LanguageCheckStaffTopic[]
}> {
  await sweepExpiredEssays()

  // Shared with the Topic reports tab (staffEssayConditions) so both tabs
  // count over identical rows — their Topics / Checked essays stats tally.
  const { where, params } = staffEssayConditions(scope, {
    userId: opts.userId,
    status: opts.status,
    topicId: opts.topicId,
    classId: opts.classId,
    mineTeacherId: opts.mineTeacherId,
  })

  // The student and topic dropdown options reflect the scope + class filter
  // only — NOT the student/status/topic filters — so switching students (or
  // keeping the pickers usable while a status filter is active) never
  // empties the lists.
  const scopeOnly = staffEssayConditions(scope, {
    classId: opts.classId,
    mineTeacherId: opts.mineTeacherId,
  })
  const scopeWhere = scopeOnly.where

  const orderBy = staffSortSql(opts.sort ?? "updated", opts.order ?? "desc")

  const [listRes, countRes, statsRes, usersRes, topicsRes] = await Promise.all([
    getPool().query(
      `SELECT e.id, e.title, e.status, e.created_at, e.updated_at,
              e.user_id, u.name AS user_name, u.email AS user_email,
              e.topic_id, lt.title AS topic_title,
              jsonb_array_length(e.images) AS page_count,
              jsonb_array_length(e.corrections) AS error_count,
              ${OVERALL_SQL} AS overall,
              ${WORD_COUNT_SQL} AS word_count
       ${STAFF_FROM}
       LEFT JOIN language_check_topics lt ON lt.id = e.topic_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
    ),
    getPool().query(
      `SELECT COUNT(*)::int AS n ${STAFF_FROM} ${where}`,
      params,
    ),
    // Stats reflect the full row filter set (scope + class/student/status/
    // topic) so the cards always describe exactly what the table shows;
    // only page/pageSize are excluded, so the cards stay stable while paging.
    // Topics counts LIVE library topics only (COUNT over the joined topic id,
    // so dangling links to deleted topics are skipped) — the same set the
    // topic filter options and the Topic reports grid offer, so all three
    // agree.
    getPool().query(
      `SELECT COUNT(*)::int AS total,
              COUNT(DISTINCT e.user_id)::int AS students,
              COUNT(DISTINCT lt.id)::int AS topics,
              ROUND(AVG(${OVERALL_SQL}), 1) AS avg_overall
       ${STAFF_FROM}
       LEFT JOIN language_check_topics lt ON lt.id = e.topic_id
       ${where}`,
      params,
    ),
    getPool().query(
      `SELECT e.user_id AS id, u.name, u.email
       ${STAFF_FROM}
       ${scopeWhere}
       GROUP BY e.user_id, u.name, u.email
       ORDER BY u.name
       LIMIT 1000`,
      scopeOnly.params,
    ),
    // Topic options follow the same rule as the student options: scope +
    // class only, never the student/status/topic filters, so the picker
    // stays usable while those are active. Topics deleted from the library
    // drop out (their essays keep the snapshot but can no longer be grouped
    // by id).
    getPool().query(
      `SELECT t.id, t.title
       ${STAFF_FROM}
       JOIN language_check_topics t ON t.id = e.topic_id
       ${scopeWhere}
       GROUP BY t.id, t.title
       ORDER BY t.title
       LIMIT 1000`,
      scopeOnly.params,
    ),
  ])

  return {
    rows: listRes.rows.map(
      (row: Record<string, unknown>): LanguageCheckStaffRow => ({
        id: row.id as string,
        userId: row.user_id as string,
        userName: (row.user_name as string) || (row.user_email as string) || "",
        userEmail: (row.user_email as string) || "",
        title: (row.title as string) || "",
        status: row.status as LanguageCheckStaffRow["status"],
        // Live library title for the row's topic link; a set id with a null
        // title means the topic was deleted (the snapshot stays, but the
        // essay drops out of the topic filter until re-linked).
        topicId: (row.topic_id as string) || null,
        topicTitle: (row.topic_title as string) || null,
        pageCount: Number(row.page_count) || 0,
        errorCount: Number(row.error_count) || 0,
        overall:
          row.overall === null || row.overall === undefined
            ? null
            : Number(row.overall),
        wordCount: Number(row.word_count) || 0,
        createdAt: toMs(row.created_at),
        updatedAt: toMs(row.updated_at),
      }),
    ),
    total: Number(countRes.rows[0]?.n) || 0,
    stats: {
      total: Number(statsRes.rows[0]?.total) || 0,
      students: Number(statsRes.rows[0]?.students) || 0,
      topics: Number(statsRes.rows[0]?.topics) || 0,
      avgOverall:
        statsRes.rows[0]?.avg_overall === null ||
        statsRes.rows[0]?.avg_overall === undefined
          ? null
          : Number(statsRes.rows[0].avg_overall),
    },
    users: usersRes.rows.map(
      (row: Record<string, unknown>): LanguageCheckStaffUser => ({
        id: row.id as string,
        name: (row.name as string) || (row.email as string) || "",
        email: (row.email as string) || "",
      }),
    ),
    topics: topicsRes.rows.map(
      (row: Record<string, unknown>): LanguageCheckStaffTopic => ({
        id: row.id as string,
        title: (row.title as string) || "",
      }),
    ),
  }
}

/**
 * Read-only staff view of one essay (transcript + corrections). Scans
 * (images) are never selected — staff see the text, not the original pages.
 */
export async function getStaffEssay(
  scope: LanguageCheckStaffScope,
  id: string,
): Promise<LanguageCheckStaffDetail | null> {
  const { clauses, params } = scopeConditions(scope)
  const add = (sql: string, ...values: unknown[]) => {
    let i = 0
    clauses.push(sql.replace(/@/g, () => `$${params.length + 1 + i++}`))
    params.push(...values)
  }
  add("e.id = @", id)
  // No retention filter: expired essays keep their record (transcript +
  // corrections) so staff can track student work across the retention
  // window; only the scans are purged.
  const { rows } = await getPool().query(
    `SELECT e.id, e.title, e.status, e.created_at, e.updated_at,
            e.user_id, u.name AS user_name, u.email AS user_email,
            e.topic_id, lt.title AS topic_title,
            e.transcript, e.checked_text, e.corrections,
            e.ocr_model, e.check_model, e.dropped_count, e.assessment, e.enhanced,
            e.topic, e.essay_type, e.question_image,
            jsonb_array_length(e.images) AS page_count
     ${STAFF_FROM}
     LEFT JOIN language_check_topics lt ON lt.id = e.topic_id
     WHERE ${clauses.join(" AND ")}`,
    params,
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) || (row.user_email as string) || "",
    userEmail: (row.user_email as string) || "",
    title: (row.title as string) || "",
    status: row.status as LanguageCheckStaffDetail["status"],
    topicId: (row.topic_id as string) || null,
    topicTitle: (row.topic_title as string) || null,
    pageCount: Number(row.page_count) || 0,
    errorCount: arrayOf<LanguageCheckError>(row.corrections).length,
    wordCount: countWords((row.transcript as string) || ""),
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
    transcript: (row.transcript as string) || "",
    checkedText: (row.checked_text as string) || "",
    corrections: arrayOf<LanguageCheckError>(row.corrections),
    ocrModel: (row.ocr_model as string) || "",
    checkModel: (row.check_model as string) || "",
    droppedCount: Number(row.dropped_count) || 0,
    assessment: (row.assessment as LanguageCheckAssessment | null) ?? null,
    enhanced: (row.enhanced as LanguageCheckEnhanced | null) ?? null,
    topic: (row.topic as string) || "",
    essayType: ((row.essay_type as string) || "") as LanguageCheckStaffDetail["essayType"],
    questionImage: (row.question_image as string) || "",
    overall:
      (row.assessment as LanguageCheckAssessment | null)?.overall ?? null,
  }
}

/** Saves an assessment for an essay the staff member can see (scope-checked). */
export async function setStaffAssessment(
  scope: LanguageCheckStaffScope,
  id: string,
  assessment: LanguageCheckAssessment,
): Promise<boolean> {
  const essay = await getStaffEssay(scope, id)
  if (!essay) return false
  await getPool().query(
    `UPDATE language_check_essays SET assessment = $1::jsonb WHERE id = $2`,
    [JSON.stringify(assessment), id],
  )
  return true
}

/** Saves enhanced essays for an essay the staff member can see (scope-checked). */
export async function setStaffEnhanced(
  scope: LanguageCheckStaffScope,
  id: string,
  enhanced: LanguageCheckEnhanced,
): Promise<boolean> {
  const essay = await getStaffEssay(scope, id)
  if (!essay) return false
  await getPool().query(
    `UPDATE language_check_essays SET enhanced = $1::jsonb WHERE id = $2`,
    [JSON.stringify(enhanced), id],
  )
  return true
}

/**
 * Renames an essay the staff member can see (scope-checked). The title is
 * the per-essay snapshot — the Topic Library entry is never touched — and
 * the updated_at trigger bumps the row under the staff list's default
 * "Updated" sort, exactly like an owner rename in the workspace.
 */
export async function renameStaffEssay(
  scope: LanguageCheckStaffScope,
  id: string,
  title: string,
): Promise<boolean> {
  // Scope check first (same pattern as setStaffAssessment): out-of-scope
  // essays look identical to missing ones, and nothing is written.
  const essay = await getStaffEssay(scope, id)
  if (!essay) return false
  await getPool().query(
    `UPDATE language_check_essays SET title = $1 WHERE id = $2`,
    [title, id],
  )
  return true
}

/**
 * Re-links or unlinks an essay the staff member can see (scope-checked).
 * With a topicId the topic resolves against the CALLER's own /
 * class-visible topics — the same rule as an upload ("a teacher scanning
 * for a student uses THEIR topic") — and its task, essay type and question
 * image are re-snapshotted onto the essay exactly like at upload. With null
 * the link is removed entirely (same shape as a legacy pre-topics essay),
 * dropping the essay out of the topic filter. The essay title is
 * deliberately left alone either way (it may have been renamed on
 * purpose). A missing/invisible topic and an out-of-scope essay both
 * return false — indistinguishable, same as the other staff writers.
 */
export async function relinkStaffEssay(
  scope: LanguageCheckStaffScope,
  viewer: TopicViewer,
  id: string,
  topicId: string | null,
): Promise<boolean> {
  // Scope check first (same pattern as setStaffAssessment): out-of-scope
  // essays look identical to missing ones, and nothing is written.
  const essay = await getStaffEssay(scope, id)
  if (!essay) return false
  if (topicId === null) {
    await getPool().query(
      `UPDATE language_check_essays
       SET topic_id = NULL, topic = '', essay_type = '', question_image = ''
       WHERE id = $1`,
      [id],
    )
    return true
  }
  const topic = await getTopic(viewer, topicId)
  if (!topic) return false
  await getPool().query(
    `UPDATE language_check_essays
     SET topic_id = $1, topic = $2, essay_type = $3, question_image = $4
     WHERE id = $5`,
    [topic.id, topic.topic, topic.essayType, topic.questionImage, id],
  )
  return true
}

/**
 * Persists a staff-initiated re-check for an essay inside the caller's staff
 * scope. Mirrors what an owner re-check writes (runCheck): new corrections
 * anchored to `checkedText`, the model that produced them, and any dropped
 * reports — status moves to 'checked' and a stale assessment is reset, since
 * it was scored against the previous corrections.
 */
export async function staffRecheckEssay(
  scope: LanguageCheckStaffScope,
  id: string,
  patch: {
    checkedText: string
    corrections: LanguageCheckError[]
    checkModel: string
    droppedCount: number
  },
): Promise<boolean> {
  // Scope check first (same pattern as setStaffAssessment): out-of-scope
  // essays look identical to missing ones, and nothing is written.
  const essay = await getStaffEssay(scope, id)
  if (!essay) return false
  await getPool().query(
    `UPDATE language_check_essays
     SET status = 'checked',
         checked_text = $1,
         corrections = $2::jsonb,
         check_model = $3,
         dropped_count = $4,
         assessment = NULL,
         enhanced = NULL
     WHERE id = $5`,
    [
      patch.checkedText,
      JSON.stringify(patch.corrections),
      patch.checkModel,
      patch.droppedCount,
      id,
    ],
  )
  return true
}

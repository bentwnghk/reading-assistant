import { getPool } from "./db"
import { getSchoolForUser } from "./users"
import {
  LANGUAGE_CHECK_MAX_ESSAYS,
  LANGUAGE_CHECK_RETENTION_DAYS,
  type LanguageCheckStatus,
} from "@/constants/languageCheck"

function toMs(value: unknown): number {
  return value ? new Date(value as string).getTime() : 0
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function mapSummary(row: Record<string, unknown>): LanguageCheckEssaySummary {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    status: row.status as LanguageCheckEssaySummary["status"],
    pageCount: Number(row.page_count) || 0,
    errorCount: Number(row.error_count) || 0,
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
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

/**
 * Retention sweep. Scans live inside the row (`images` JSONB), so deleting
 * the row deletes them too. Runs opportunistically (list/count) — this app
 * has no scheduler of its own.
 */
export async function deleteExpiredEssays(): Promise<void> {
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE created_at < now() - make_interval(days => $1)`,
    [LANGUAGE_CHECK_RETENTION_DAYS],
  )
}

/** Lightweight list: never selects images/transcript/corrections payloads. */
export async function listEssays(
  userId: string,
): Promise<LanguageCheckEssaySummary[]> {
  await deleteExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT id, title, status, created_at, updated_at,
            jsonb_array_length(images) AS page_count,
            jsonb_array_length(corrections) AS error_count
     FROM language_check_essays
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, LANGUAGE_CHECK_MAX_ESSAYS],
  )
  return rows.map(mapSummary)
}

export async function getEssay(
  userId: string,
  id: string,
): Promise<LanguageCheckEssay | null> {
  // Expired essays are purged on direct access too (the list sweep may not
  // have run, e.g. for an id that only lives in the client-side cache).
  await getPool().query(
    `DELETE FROM language_check_essays
     WHERE id = $1 AND user_id = $2
       AND created_at < now() - make_interval(days => $3)`,
    [id, userId, LANGUAGE_CHECK_RETENTION_DAYS],
  )
  const { rows } = await getPool().query(
    `SELECT * FROM language_check_essays WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  return rows[0] ? mapEssay(rows[0]) : null
}

export async function countEssays(userId: string): Promise<number> {
  await deleteExpiredEssays()
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM language_check_essays WHERE user_id = $1`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function createEssay(
  userId: string,
  data: { title: string; images: string[]; ocrModel?: string },
): Promise<LanguageCheckEssay> {
  const { rows } = await getPool().query(
    `INSERT INTO language_check_essays (user_id, title, images, ocr_model)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [userId, data.title, JSON.stringify(data.images), data.ocrModel ?? ""],
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

  if (sets.length === 0) return true

  values.push(id, userId)
  const result = await getPool().query(
    `UPDATE language_check_essays SET ${sets.join(", ")}
     WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
    values,
  )
  return (result.rowCount ?? 0) > 0
}

export async function deleteEssay(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM language_check_essays WHERE id = $1 AND user_id = $2`,
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
function scopeConditions(
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

const STAFF_FROM = `FROM language_check_essays e JOIN users u ON u.id = e.user_id`

/** Lightweight staff list: no images/transcript/corrections payloads. */
export async function listStaffEssays(
  scope: LanguageCheckStaffScope,
  opts: {
    page: number
    pageSize: number
    userId?: string
    status?: LanguageCheckStatus
    /** Free-text search over student name/email and essay title. */
    q?: string
  },
): Promise<{
  rows: LanguageCheckStaffRow[]
  total: number
  stats: LanguageCheckStaffStats
  users: LanguageCheckStaffUser[]
}> {
  await deleteExpiredEssays()

  const { clauses, params } = scopeConditions(scope)
  const add = (sql: string, ...values: unknown[]) => {
    let i = 0
    clauses.push(sql.replace(/@/g, () => `$${params.length + 1 + i++}`))
    params.push(...values)
  }
  if (opts.userId) add("e.user_id = @", opts.userId)
  if (opts.status) add("e.status = @", opts.status)
  if (opts.q) {
    const pattern = `%${opts.q}%`
    add(
      "(u.name ILIKE @ OR u.email ILIKE @ OR e.title ILIKE @)",
      pattern,
      pattern,
      pattern,
    )
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""

  // Stats and the student filter reflect the scope only (not page filters), so
  // the dropdown and cards stay stable while paging/filtering.
  const scopeOnly = scopeConditions(scope)
  const scopeWhere =
    scopeOnly.clauses.length > 0
      ? `WHERE ${scopeOnly.clauses.join(" AND ")}`
      : ""

  const [listRes, countRes, statsRes, usersRes] = await Promise.all([
    getPool().query(
      `SELECT e.id, e.title, e.status, e.created_at, e.updated_at,
              e.user_id, u.name AS user_name, u.email AS user_email,
              jsonb_array_length(e.images) AS page_count,
              jsonb_array_length(e.corrections) AS error_count
       ${STAFF_FROM}
       ${where}
       ORDER BY e.updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
    ),
    getPool().query(
      `SELECT COUNT(*)::int AS n ${STAFF_FROM} ${where}`,
      params,
    ),
    getPool().query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE e.status = 'checked')::int AS checked,
              COUNT(*) FILTER (WHERE e.status = 'transcribed')::int AS transcribed,
              COUNT(*) FILTER (WHERE e.status = 'draft')::int AS draft,
              COUNT(DISTINCT e.user_id)::int AS students,
              COALESCE(SUM(jsonb_array_length(e.images)), 0)::int AS pages,
              COALESCE(SUM(jsonb_array_length(e.corrections)), 0)::int AS corrections
       ${STAFF_FROM}
       ${scopeWhere}`,
      scopeOnly.params,
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
        pageCount: Number(row.page_count) || 0,
        errorCount: Number(row.error_count) || 0,
        createdAt: toMs(row.created_at),
        updatedAt: toMs(row.updated_at),
      }),
    ),
    total: Number(countRes.rows[0]?.n) || 0,
    stats: {
      total: Number(statsRes.rows[0]?.total) || 0,
      checked: Number(statsRes.rows[0]?.checked) || 0,
      transcribed: Number(statsRes.rows[0]?.transcribed) || 0,
      draft: Number(statsRes.rows[0]?.draft) || 0,
      students: Number(statsRes.rows[0]?.students) || 0,
      pages: Number(statsRes.rows[0]?.pages) || 0,
      corrections: Number(statsRes.rows[0]?.corrections) || 0,
    },
    users: usersRes.rows.map(
      (row: Record<string, unknown>): LanguageCheckStaffUser => ({
        id: row.id as string,
        name: (row.name as string) || (row.email as string) || "",
        email: (row.email as string) || "",
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
  add(
    "e.created_at >= now() - make_interval(days => @)",
    LANGUAGE_CHECK_RETENTION_DAYS,
  )
  const { rows } = await getPool().query(
    `SELECT e.id, e.title, e.status, e.created_at, e.updated_at,
            e.user_id, u.name AS user_name, u.email AS user_email,
            e.transcript, e.checked_text, e.corrections,
            e.ocr_model, e.check_model, e.dropped_count,
            jsonb_array_length(e.images) AS page_count
     ${STAFF_FROM}
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
    pageCount: Number(row.page_count) || 0,
    errorCount: arrayOf<LanguageCheckError>(row.corrections).length,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
    transcript: (row.transcript as string) || "",
    checkedText: (row.checked_text as string) || "",
    corrections: arrayOf<LanguageCheckError>(row.corrections),
    ocrModel: (row.ocr_model as string) || "",
    checkModel: (row.check_model as string) || "",
    droppedCount: Number(row.dropped_count) || 0,
  }
}

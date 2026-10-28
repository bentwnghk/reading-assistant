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
    ownerId: (row.owner_id as string) || (row.user_id as string) || "",
    ownerName: (row.owner_name as string) || "",
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
            jsonb_array_length(e.corrections) AS error_count
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
  // deleted, checked ones only have their scans purged. The caller may be
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
  const { rows } = await getPool().query(
    `SELECT e.*, e.user_id AS owner_id, u.name AS owner_name
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
  },
): Promise<LanguageCheckEssay> {
  const { rows } = await getPool().query(
    `WITH ins AS (
       INSERT INTO language_check_essays (user_id, uploaded_by, title, images, ocr_model)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING *
     )
     SELECT ins.*, ins.user_id AS owner_id, u.name AS owner_name
     FROM ins LEFT JOIN users u ON u.id = ins.user_id`,
    [
      data.userId,
      data.uploadedBy ?? null,
      data.title,
      JSON.stringify(data.images),
      data.ocrModel ?? "",
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
     WHERE id = $${values.length - 1}
       AND (user_id = $${values.length} OR uploaded_by = $${values.length})`,
    values,
  )
  return (result.rowCount ?? 0) > 0
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
    /** Free-text search over essay titles only (students filter via userId). */
    q?: string
    /**
     * Class filter — narrows rows AND stats like the other filters, but is
     * the only filter that also narrows the student options (a class scope
     * implies its students). Intersects with the staff scope (a foreign
     * class's members are not in scope, so nothing leaks).
     */
    classId?: string
  },
): Promise<{
  rows: LanguageCheckStaffRow[]
  total: number
  stats: LanguageCheckStaffStats
  users: LanguageCheckStaffUser[]
}> {
  await sweepExpiredEssays()

  const { clauses, params } = scopeConditions(scope)
  const add = (sql: string, ...values: unknown[]) => {
    let i = 0
    clauses.push(sql.replace(/@/g, () => `$${params.length + 1 + i++}`))
    params.push(...values)
  }
  if (opts.userId) add("e.user_id = @", opts.userId)
  if (opts.status) add("e.status = @", opts.status)
  if (opts.q) add("e.title ILIKE @", `%${opts.q}%`)
  // The class filter narrows rows too. Every add() that feeds `where` must
  // run BEFORE it is stringified — a later add() pushes its value into
  // `params` while the clause lands in the already-built string's blind
  // spot, shifting the LIMIT/OFFSET numbering (LIMIT $3 with no $2 anywhere
  // → "could not determine data type of parameter $2").
  const inClass =
    "e.user_id IN (SELECT student_id FROM class_members WHERE class_id = @)"
  if (opts.classId) add(inClass, opts.classId)
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""

  // The student dropdown options reflect the scope + class filter only —
  // NOT the student/status/search filters — so switching students (or
  // keeping the picker usable while a status filter is active) never
  // empties the list.
  const scopeOnly = scopeConditions(scope)
  const scopeAdd = (sql: string, ...values: unknown[]) => {
    let i = 0
    scopeOnly.clauses.push(
      sql.replace(/@/g, () => `$${scopeOnly.params.length + 1 + i++}`),
    )
    scopeOnly.params.push(...values)
  }
  if (opts.classId) scopeAdd(inClass, opts.classId)
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
    // Stats reflect the full row filter set (scope + class/student/status/
    // search) so the cards always describe exactly what the table shows;
    // only page/pageSize are excluded, so the cards stay stable while paging.
    getPool().query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE e.status = 'checked')::int AS checked,
              COUNT(*) FILTER (WHERE e.status = 'transcribed')::int AS transcribed,
              COUNT(*) FILTER (WHERE e.status = 'draft')::int AS draft,
              COUNT(DISTINCT e.user_id)::int AS students,
              COALESCE(SUM(jsonb_array_length(e.images)), 0)::int AS pages,
              COALESCE(SUM(jsonb_array_length(e.corrections)), 0)::int AS corrections
       ${STAFF_FROM}
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
  // No retention filter: expired essays keep their record (transcript +
  // corrections) so staff can track student work across the retention
  // window; only the scans are purged.
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

import { getPool } from "./db"
import { getSchoolForUser } from "./users"

function mapPresetRow(row: Record<string, unknown>): AssignmentPreset {
  const studentIds = Array.isArray(row.student_ids)
    ? (row.student_ids as string[])
    : []
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    createdByName: (row.created_by_name as string) || null,
    schoolId: row.school_id as string,
    name: row.name as string,
    description: (row.description as string) || "",
    studentIds,
    studentCount: studentIds.length,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }
}

const SELECT_COLS = `ap.id, ap.teacher_id, ap.school_id, ap.name, ap.description,
       ap.student_ids, ap.created_at, ap.updated_at,
       u.name AS created_by_name`

/**
 * Resolve presets visible to the requester:
 *   - super-admin: all presets across all schools
 *   - admin / teacher: all presets in their school (teachers are read-only —
 *     only admins/super-admins can create/modify presets)
 */
export async function getPresetsForUser(
  userId: string,
  role: UserRole,
): Promise<AssignmentPreset[]> {
  const pool = getPool()
  if (role === "super-admin") {
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLS}
       FROM assignment_presets ap
       LEFT JOIN users u ON u.id = ap.teacher_id
       ORDER BY ap.name ASC`,
    )
    return rows.map(mapPresetRow)
  }

  const schoolId = await getSchoolForUser(userId)
  if (!schoolId) return []

  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM assignment_presets ap
     LEFT JOIN users u ON u.id = ap.teacher_id
     WHERE ap.school_id = $1
     ORDER BY ap.name ASC`,
    [schoolId],
  )
  return rows.map(mapPresetRow)
}

/** Fetch a single preset by id (null when not found). */
export async function getPresetById(
  presetId: string,
): Promise<AssignmentPreset | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM assignment_presets ap
     LEFT JOIN users u ON u.id = ap.teacher_id
     WHERE ap.id = $1`,
    [presetId],
  )
  return rows.length > 0 ? mapPresetRow(rows[0]) : null
}

/**
 * Fetch a preset when the viewer may use it (read access mirrors
 * getPresetsForUser: super-admin any preset; teacher/admin presets in
 * their own school). Null when not found or out of scope.
 */
export async function getPresetForViewer(
  presetId: string,
  userId: string,
  role: UserRole,
): Promise<AssignmentPreset | null> {
  const preset = await getPresetById(presetId)
  if (!preset) return null
  if (role === "super-admin") return preset
  const schoolId = await getSchoolForUser(userId)
  if (!schoolId || preset.schoolId !== schoolId) return null
  return preset
}

/**
 * Presets referenced by any assignment the user created
 * (assignments.applied_preset_id — set at create time). Exact, no roster
 * heuristics; used by the Teacher Dashboard / Student Data dropdowns so
 * teachers only see rosters relevant to their own assignments. Deleted
 * presets drop out via the inner join.
 */
export async function getPresetsUsedByUser(
  userId: string,
): Promise<AssignmentPreset[]> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT DISTINCT ${SELECT_COLS}
     FROM assignment_presets ap
     JOIN assignments a ON a.applied_preset_id = ap.id
     LEFT JOIN users u ON u.id = ap.teacher_id
     WHERE a.teacher_id = $1
     ORDER BY ap.name ASC`,
    [userId],
  )
  return rows.map(mapPresetRow)
}

export interface CreatePresetInput {
  teacherId: string
  role: UserRole
  name: string
  description?: string
  studentIds: string[]
  /** super-admin may target a specific school; otherwise the creator's school is used. */
  schoolId?: string
}

export async function createPreset(
  input: CreatePresetInput,
): Promise<AssignmentPreset> {
  const pool = getPool()
  const schoolId =
    input.schoolId ?? (await getSchoolForUser(input.teacherId))
  if (!schoolId) {
    throw new Error("Could not resolve a school for the requester")
  }

  const { rows } = await pool.query(
    `INSERT INTO assignment_presets (teacher_id, school_id, name, description, student_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, teacher_id, school_id, name, description, student_ids, created_at, updated_at`,
    [
      input.teacherId,
      schoolId,
      input.name.trim(),
      input.description?.trim() || "",
      JSON.stringify(input.studentIds),
    ],
  )
  return mapPresetRow(rows[0])
}

export interface UpdatePresetInput {
  name?: string
  description?: string
  studentIds?: string[]
}

/**
 * Update a preset. Permission: admin/super-admin only.
 *   - super-admin: any preset
 *   - admin: any preset in their school
 *   - teacher: never
 */
export async function updatePreset(
  presetId: string,
  requesterId: string,
  role: UserRole,
  updates: UpdatePresetInput,
): Promise<AssignmentPreset | null> {
  const pool = getPool()

  // Permission check
  const access = await checkAccess(presetId, requesterId, role)
  if (!access) return null

  const sets: string[] = []
  const values: unknown[] = []
  let i = 1

  if (updates.name !== undefined) {
    sets.push(`name = $${i++}`)
    values.push(updates.name.trim())
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${i++}`)
    values.push(updates.description.trim())
  }
  if (updates.studentIds !== undefined) {
    sets.push(`student_ids = $${i++}`)
    values.push(JSON.stringify(updates.studentIds))
  }

  if (sets.length === 0) {
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLS}
       FROM assignment_presets ap
       LEFT JOIN users u ON u.id = ap.teacher_id
       WHERE ap.id = $1`,
      [presetId],
    )
    return rows.length > 0 ? mapPresetRow(rows[0]) : null
  }

  sets.push(`updated_at = NOW()`)
  values.push(presetId)

  await pool.query(
    `UPDATE assignment_presets SET ${sets.join(", ")}
     WHERE id = $${i++}`,
    values,
  )

  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM assignment_presets ap
     LEFT JOIN users u ON u.id = ap.teacher_id
     WHERE ap.id = $1`,
    [presetId],
  )
  return rows.length > 0 ? mapPresetRow(rows[0]) : null
}

/**
 * Delete a preset. Permission: admin/super-admin only.
 */
export async function deletePreset(
  presetId: string,
  requesterId: string,
  role: UserRole,
): Promise<boolean> {
  const pool = getPool()

  const access = await checkAccess(presetId, requesterId, role)
  if (!access) return false

  const result = await pool.query(
    `DELETE FROM assignment_presets WHERE id = $1`,
    [presetId],
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Resolve whether the requester may modify a given preset.
 *   - super-admin: always
 *   - admin: same school as the preset
 *   - teacher: never (teachers may only view/apply presets)
 */
async function checkAccess(
  presetId: string,
  requesterId: string,
  role: UserRole,
): Promise<boolean> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT teacher_id, school_id FROM assignment_presets WHERE id = $1`,
    [presetId],
  )
  if (rows.length === 0) return false
  const preset = rows[0]
  if (role === "super-admin") return true
  if (role === "admin") {
    const requesterSchool = await getSchoolForUser(requesterId)
    return requesterSchool === preset.school_id
  }
  // teacher — read/apply only
  return false
}

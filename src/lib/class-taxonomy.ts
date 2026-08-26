import { getClient } from "./db"

export interface SubjectInfo {
  id: string
  schoolId: string
  name: string
  sortOrder: number
  createdAt: number
}

export interface GradeInfo {
  id: string
  schoolId: string
  name: string
  sortOrder: number
  createdAt: number
}

function mapSubjectRow(row: Record<string, unknown>): SubjectInfo {
  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    name: row.name as string,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : parseInt(row.sort_order as string) || 0,
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

function mapGradeRow(row: Record<string, unknown>): GradeInfo {
  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    name: row.name as string,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : parseInt(row.sort_order as string) || 0,
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function getSubjectsForSchool(schoolId: string): Promise<SubjectInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, school_id, name, sort_order, created_at FROM subjects
       WHERE school_id = $1 ORDER BY sort_order ASC, name ASC`,
      [schoolId]
    )
    return result.rows.map(mapSubjectRow)
  } finally {
    client.release()
  }
}

export async function getAllSubjects(): Promise<SubjectInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, school_id, name, sort_order, created_at FROM subjects ORDER BY sort_order ASC, name ASC`
    )
    return result.rows.map(mapSubjectRow)
  } finally {
    client.release()
  }
}

export async function createSubject(schoolId: string, name: string, sortOrder: number): Promise<SubjectInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `INSERT INTO subjects (school_id, name, sort_order) VALUES ($1, $2, $3)
       RETURNING id, school_id, name, sort_order, created_at`,
      [schoolId, name, sortOrder]
    )
    return result.rows.length > 0 ? mapSubjectRow(result.rows[0]) : null
  } catch {
    return null
  } finally {
    client.release()
  }
}

export async function updateSubject(id: string, schoolId: string, name: string, sortOrder: number): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE subjects SET name = $1, sort_order = $2 WHERE id = $3 AND school_id = $4`,
      [name, sortOrder, id, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/** Deletes a subject; classes referencing it have subject_id set to NULL (FK ON DELETE SET NULL). */
export async function deleteSubject(id: string, schoolId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `DELETE FROM subjects WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function countClassesForSubject(id: string, schoolId: string): Promise<number> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM classes WHERE subject_id = $1 AND school_id = $2`,
      [id, schoolId]
    )
    return parseInt(result.rows[0]?.count as string) || 0
  } finally {
    client.release()
  }
}

// ─── Grades ───────────────────────────────────────────────────────────────────

export async function getGradesForSchool(schoolId: string): Promise<GradeInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, school_id, name, sort_order, created_at FROM grades
       WHERE school_id = $1 ORDER BY sort_order ASC, name ASC`,
      [schoolId]
    )
    return result.rows.map(mapGradeRow)
  } finally {
    client.release()
  }
}

export async function getAllGrades(): Promise<GradeInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, school_id, name, sort_order, created_at FROM grades ORDER BY sort_order ASC, name ASC`
    )
    return result.rows.map(mapGradeRow)
  } finally {
    client.release()
  }
}

export async function createGrade(schoolId: string, name: string, sortOrder: number): Promise<GradeInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `INSERT INTO grades (school_id, name, sort_order) VALUES ($1, $2, $3)
       RETURNING id, school_id, name, sort_order, created_at`,
      [schoolId, name, sortOrder]
    )
    return result.rows.length > 0 ? mapGradeRow(result.rows[0]) : null
  } catch {
    return null
  } finally {
    client.release()
  }
}

export async function updateGrade(id: string, schoolId: string, name: string, sortOrder: number): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE grades SET name = $1, sort_order = $2 WHERE id = $3 AND school_id = $4`,
      [name, sortOrder, id, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/** Deletes a grade; classes referencing it have grade_id set to NULL (FK ON DELETE SET NULL). */
export async function deleteGrade(id: string, schoolId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `DELETE FROM grades WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function countClassesForGrade(id: string, schoolId: string): Promise<number> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM classes WHERE grade_id = $1 AND school_id = $2`,
      [id, schoolId]
    )
    return parseInt(result.rows[0]?.count as string) || 0
  } finally {
    client.release()
  }
}

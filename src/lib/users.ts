import { getClient } from "./db"

export type UserRole = 'super-admin' | 'admin' | 'teacher' | 'student'

export interface SchoolInfo {
  id: string
  name: string
  domain: string
  userCount?: number
  createdAt: number
}

export interface UserWithRole {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: UserRole
  classId?: string
  className?: string
  taughtClassIds?: string[]
  taughtClassNames?: string[]
  schoolId?: string
  schoolName?: string
  schoolAccessEndsAt?: string | null
  createdAt?: number
}

export interface ClassInfo {
  id: string
  name: string
  description?: string
  teacherId?: string
  teacherName?: string
  schoolId?: string
  schoolName?: string
  studentCount?: number
  createdAt: number
}

export interface ClassMember {
  studentId: string
  studentName?: string
  studentEmail?: string
  studentImage?: string
  joinedAt: number
}

export interface StudentSessionData {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  docTitle: string
  studentAge: number
  extractedText: string
  summary?: string
  testScore?: number
  testCompleted?: boolean
  vocabularyQuizScore?: number
  spellingGameBestScore?: number
  glossaryCount: number
  progress: number
  createdAt: number
  updatedAt: number
}

export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || ''
  return adminEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails()
  return adminEmails.includes(email.toLowerCase())
}

export function getSuperAdminEmails(): string[] {
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS || ''
  return superAdminEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
}

export function isSuperAdminEmail(email: string): boolean {
  const superAdminEmails = getSuperAdminEmails()
  return superAdminEmails.includes(email.toLowerCase())
}

export async function getUserRole(userId: string, email?: string | null): Promise<UserRole> {
  if (email && isSuperAdminEmail(email)) {
    return 'super-admin'
  }
  
  if (email && isAdminEmail(email)) {
    return 'admin'
  }
  
  const client = await getClient()
  try {
    const result = await client.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    )
    
    if (result.rows.length > 0) {
      return result.rows[0].role as UserRole
    }
    
    return 'student'
  } finally {
    client.release()
  }
}

export async function ensureUserRole(userId: string, email?: string | null): Promise<UserRole> {
  const role = await getUserRole(userId, email)
  
  const client = await getClient()
  try {
    if (role === 'super-admin' || role === 'admin') {
      try {
        await client.query(
          `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET role = $2`,
          [userId, role]
        )
      } catch {
        // If INSERT fails (e.g., check constraint not updated), role is still valid
        // based on email configuration
      }
    } else {
      const existingResult = await client.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
      )
      
      if (existingResult.rows.length === 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role) VALUES ($1, 'student')`,
          [userId]
        )
      }
    }
    
    return role
  } finally {
    client.release()
  }
}

export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET role = $2`,
      [userId, role]
    )
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

export async function getAllUsers(): Promise<UserWithRole[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        cm.class_id as "classId",
        c.name as "className",
        u.school_id as "schoolId",
        s.name as "schoolName",
        u.school_access_ends_at as "schoolAccessEndsAt",
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       LEFT JOIN classes c ON cm.class_id = c.id
       LEFT JOIN schools s ON u.school_id = s.id
       ORDER BY u."createdAt" DESC`
    )
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      classId: row.classId,
      className: row.className,
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      schoolAccessEndsAt: row.schoolAccessEndsAt || null,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

// ─── School CRUD ───────────────────────────────────────────────────────────────

export async function getOrCreateSchoolByDomain(domain: string): Promise<SchoolInfo> {
  const client = await getClient()
  try {
    // Upsert: insert if not present, return existing otherwise
    const result = await client.query(
      `INSERT INTO schools (name, domain)
       VALUES ($1, $2)
       ON CONFLICT (domain) DO UPDATE SET domain = EXCLUDED.domain
       RETURNING id, name, domain, created_at`,
      [domain, domain]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      createdAt: new Date(row.created_at).getTime(),
    }
  } finally {
    client.release()
  }
}

export async function ensureUserSchool(userId: string, email: string): Promise<void> {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return
  const domain = email.slice(atIndex + 1).toLowerCase()
  if (!domain) return

  const school = await getOrCreateSchoolByDomain(domain)

  const client = await getClient()
  try {
    // Only assign if the user has no school yet (preserves Admin manual overrides)
    await client.query(
      `UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL`,
      [school.id, userId]
    )
  } finally {
    client.release()
  }
}

export async function getAllSchools(): Promise<SchoolInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT
        s.id, s.name, s.domain, s.created_at,
        COUNT(u.id) AS user_count
       FROM schools s
       LEFT JOIN users u ON u.school_id = s.id
       GROUP BY s.id, s.name, s.domain, s.created_at
       ORDER BY s.created_at DESC`
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      userCount: parseInt(row.user_count) || 0,
      createdAt: new Date(row.created_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getSchoolById(schoolId: string): Promise<SchoolInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, name, domain, created_at FROM schools WHERE id = $1`,
      [schoolId]
    )
    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      createdAt: new Date(row.created_at).getTime(),
    }
  } finally {
    client.release()
  }
}

export async function updateSchoolName(schoolId: string, name: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE schools SET name = $1 WHERE id = $2`,
      [name, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteSchool(schoolId: string): Promise<boolean> {
  const client = await getClient()
  try {
    // FK ON DELETE SET NULL will un-assign users automatically
    const result = await client.query(
      `DELETE FROM schools WHERE id = $1`,
      [schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function assignUserSchool(userId: string, schoolId: string | null): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE users SET school_id = $1 WHERE id = $2`,
      [schoolId, userId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function createClass(name: string, description: string, teacherId?: string, schoolId?: string): Promise<ClassInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `INSERT INTO classes (name, description, teacher_id, school_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, description, teacher_id, school_id, created_at`,
      [name, description, teacherId || null, schoolId || null]
    )
    
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      teacherId: row.teacher_id,
      schoolId: row.school_id,
      createdAt: new Date(row.created_at).getTime(),
    }
  } catch {
    return null
  } finally {
    client.release()
  }
}

export async function updateClass(classId: string, name: string, description: string, teacherId?: string, schoolId?: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE classes SET name = $1, description = $2, teacher_id = $3, school_id = $4 WHERE id = $5`,
      [name, description, teacherId || null, schoolId || null, classId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteClass(classId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query('DELETE FROM classes WHERE id = $1', [classId])
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

const CLASS_SELECT = `
  SELECT 
    c.id, c.name, c.description, c.teacher_id, c.school_id, c.created_at,
    u.name as teacher_name,
    s.name as school_name,
    (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count
  FROM classes c
  LEFT JOIN users u ON c.teacher_id = u.id
  LEFT JOIN schools s ON c.school_id = s.id
`

function mapClassRow(row: Record<string, unknown>): ClassInfo {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    teacherId: row.teacher_id as string | undefined,
    teacherName: row.teacher_name as string | undefined,
    schoolId: row.school_id as string | undefined,
    schoolName: row.school_name as string | undefined,
    studentCount: parseInt(row.student_count as string) || 0,
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

export async function getAllClasses(): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} ORDER BY c.created_at DESC`
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** All classes that belong to a given school */
export async function getClassesForSchool(schoolId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} WHERE c.school_id = $1 ORDER BY c.created_at DESC`,
      [schoolId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** Classes taught by a teacher — only classes where they are the assigned teacher */
export async function getClassesForTeacher(teacherId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT}
       WHERE c.teacher_id = $1
       ORDER BY c.created_at DESC`,
      [teacherId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** Lookup a user's school_id directly from the DB */
export async function getSchoolForUser(userId: string): Promise<string | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT school_id FROM users WHERE id = $1`,
      [userId]
    )
    return result.rows.length > 0 ? (result.rows[0].school_id ?? null) : null
  } finally {
    client.release()
  }
}

/** All users (of any role) belonging to a given school */
export async function getUsersInSchool(schoolId: string): Promise<UserWithRole[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        u.school_id as "schoolId",
        s.name as "schoolName",
        u.school_access_ends_at as "schoolAccessEndsAt",
        cm.class_id as "classId",
        c.name as "className",
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       LEFT JOIN classes c ON cm.class_id = c.id
       WHERE u.school_id = $1
       ORDER BY u."createdAt" DESC`,
      [schoolId]
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      schoolAccessEndsAt: row.schoolAccessEndsAt || null,
      classId: row.classId,
      className: row.className,
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

/**
 * Returns true if the teacher belongs to the same school as the class,
 * or if role is admin (admins bypass school scoping).
 */
export async function canAccessClass(userId: string, userRole: string, classId: string): Promise<boolean> {
  if (userRole === 'super-admin') return true
  if (userRole === 'admin') return true
  if (userRole !== 'teacher') return false

  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1
       FROM classes c
       JOIN users u ON u.id = $1
       WHERE c.id = $2
         AND c.school_id IS NOT NULL
         AND c.school_id = u.school_id`,
      [userId, classId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function getClassMembers(classId: string): Promise<ClassMember[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        cm.student_id, cm.joined_at,
        u.name as student_name, u.email as student_email, u.image as student_image
       FROM class_members cm
       JOIN users u ON cm.student_id = u.id
       WHERE cm.class_id = $1
       ORDER BY cm.joined_at DESC`,
      [classId]
    )
    
    return result.rows.map(row => ({
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentImage: row.student_image,
      joinedAt: new Date(row.joined_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function addStudentToClass(classId: string, studentId: string): Promise<boolean> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO class_members (class_id, student_id) VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET class_id = $1`,
      [classId, studentId]
    )
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

export async function removeStudentFromClass(studentId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      'DELETE FROM class_members WHERE student_id = $1',
      [studentId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function getStudentClassId(studentId: string): Promise<string | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      'SELECT class_id FROM class_members WHERE student_id = $1',
      [studentId]
    )
    return result.rows.length > 0 ? result.rows[0].class_id : null
  } finally {
    client.release()
  }
}

function calculateProgress(row: {
  extracted_text: string
  summary?: string
  mind_map?: string
  adapted_text?: string
  test_completed?: boolean
  analyzed_sentences?: Record<string, unknown>
  highlighted_words?: string[]
  glossary?: unknown[]
  spelling_game_best_score?: number
  vocabulary_quiz_score?: number
}): number {
  const hasExtractedText = !!row.extracted_text
  const steps = [
    hasExtractedText,
    !!row.summary,
    !!row.mind_map,
    !!row.adapted_text,
    row.test_completed,
    Object.keys(row.analyzed_sentences || {}).length > 0,
    (row.highlighted_words || []).length > 0,
    (row.glossary || []).length > 0,
    (row.spelling_game_best_score || 0) > 0,
    (row.vocabulary_quiz_score || 0) > 0,
  ]
  const completedCount = steps.filter(Boolean).length
  return Math.round((completedCount / steps.length) * 100)
}

export async function getStudentSessionsForClass(classId: string): Promise<StudentSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title, rs.student_age, rs.extracted_text, rs.summary,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        rs.glossary, rs.highlighted_words, rs.analyzed_sentences, rs.adapted_text, rs.mind_map,
        rs.created_at, rs.updated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN class_members cm ON rs.user_id = cm.student_id
       JOIN users u ON rs.user_id = u.id
       WHERE cm.class_id = $1
       ORDER BY rs.updated_at DESC`,
      [classId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || row.extracted_text?.slice(0, 50) || 'Untitled',
      studentAge: row.student_age,
      extractedText: row.extracted_text,
      summary: row.summary,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getStudentSessions(studentId: string): Promise<StudentSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title, rs.student_age, rs.extracted_text, rs.summary,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        rs.glossary, rs.highlighted_words, rs.analyzed_sentences, rs.adapted_text, rs.mind_map,
        rs.created_at, rs.updated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       WHERE rs.user_id = $1
       ORDER BY rs.updated_at DESC`,
      [studentId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || row.extracted_text?.slice(0, 50) || 'Untitled',
      studentAge: row.student_age,
      extractedText: row.extracted_text,
      summary: row.summary,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getUsersForAdmin(adminSchoolId: string): Promise<UserWithRole[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        u.school_id as "schoolId",
        s.name as "schoolName",
        cm.class_id as "classId",
        c.name as "className",
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       LEFT JOIN classes c ON cm.class_id = c.id
       WHERE u.school_id = $1
       ORDER BY u."createdAt" DESC`,
      [adminSchoolId]
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      classId: row.classId,
      className: row.className,
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

export async function getClassesForAdmin(adminSchoolId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} WHERE c.school_id = $1 ORDER BY c.created_at DESC`,
      [adminSchoolId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

export async function canManageUser(actorId: string, actorRole: string, targetUserId: string): Promise<boolean> {
  if (actorRole === 'super-admin') return true
  if (actorRole !== 'admin') return false
  
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM users u1, users u2 
       LEFT JOIN user_roles ur ON ur.user_id = u2.id
       WHERE u1.id = $1 AND u2.id = $2 
       AND u1.school_id = u2.school_id 
       AND u1.school_id IS NOT NULL
       AND ur.role NOT IN ('super-admin', 'admin')`,
      [actorId, targetUserId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function canManageClass(actorId: string, actorRole: string, classId: string): Promise<boolean> {
  if (actorRole === 'super-admin') return true
  if (actorRole !== 'admin') return false
  
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM classes c, users u 
       WHERE c.id = $1 AND u.id = $2 
       AND c.school_id = u.school_id 
       AND c.school_id IS NOT NULL`,
      [classId, actorId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function isTeacherOfClass(teacherId: string, classId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
      [classId, teacherId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

let schoolAccessEndsAtColumnEnsured = false

export async function ensureSchoolAccessEndsAtColumn(): Promise<void> {
  if (schoolAccessEndsAtColumnEnsured) return
  const client = await getClient()
  try {
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_access_ends_at TIMESTAMP WITH TIME ZONE`
    )
    schoolAccessEndsAtColumnEnsured = true
  } catch (error) {
    console.error("Failed to ensure school_access_ends_at column:", error)
  } finally {
    client.release()
  }
}

export async function revokeSchoolAccessBulk(
  userIds: string[],
  graceDays: number = 2
): Promise<{ success: string[]; failed: string[] }> {
  await ensureSchoolAccessEndsAtColumn()
  const success: string[] = []
  const failed: string[] = []

  for (const userId of userIds) {
    const client = await getClient()
    try {
      const checkResult = await client.query(
        `SELECT school_id FROM users WHERE id = $1 AND school_id IS NOT NULL`,
        [userId]
      )
      if (checkResult.rows.length === 0) {
        failed.push(userId)
        continue
      }

      await client.query(
        `UPDATE users SET school_access_ends_at = NOW() + ($1 || ' days')::INTERVAL WHERE id = $2`,
        [graceDays, userId]
      )
      success.push(userId)
    } catch {
      failed.push(userId)
    } finally {
      client.release()
    }
  }

  return { success, failed }
}

export async function cleanupExpiredSchoolAccess(): Promise<number> {
  await ensureSchoolAccessEndsAtColumn()
  const client = await getClient()
  try {
    const userResult = await client.query(
      `SELECT id, school_id FROM users
       WHERE school_access_ends_at IS NOT NULL
         AND school_access_ends_at < NOW()
         AND school_id IS NOT NULL`
    )

    if (userResult.rows.length === 0) return 0

    const userIds = userResult.rows.map((r) => r.id)

    await client.query(
      `DELETE FROM school_subscription_usage
       WHERE user_id = ANY($1)`,
      [userIds]
    )

    const result = await client.query(
      `UPDATE users
       SET school_id = NULL, school_access_ends_at = NULL
       WHERE id = ANY($1)`,
      [userIds]
    )
    return result.rowCount ?? 0
  } catch (error) {
    console.error("Failed to cleanup expired school access:", error)
    return 0
  } finally {
    client.release()
  }
}

import { getClient } from "./db"

export type UserRole = 'admin' | 'teacher' | 'student'

export interface UserWithRole {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: UserRole
  classId?: string
  className?: string
  createdAt?: number
}

export interface ClassInfo {
  id: string
  name: string
  description?: string
  teacherId?: string
  teacherName?: string
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

export async function getUserRole(userId: string, email?: string | null): Promise<UserRole> {
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
    if (role === 'admin') {
      await client.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')
         ON CONFLICT (user_id) DO UPDATE SET role = 'admin'`,
        [userId]
      )
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
        c.name as "className"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       LEFT JOIN classes c ON cm.class_id = c.id
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
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

export async function createClass(name: string, description: string, teacherId?: string): Promise<ClassInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `INSERT INTO classes (name, description, teacher_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, description, teacher_id, created_at`,
      [name, description, teacherId || null]
    )
    
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      teacherId: row.teacher_id,
      createdAt: new Date(row.created_at).getTime(),
    }
  } catch {
    return null
  } finally {
    client.release()
  }
}

export async function updateClass(classId: string, name: string, description: string, teacherId?: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE classes SET name = $1, description = $2, teacher_id = $3 WHERE id = $4`,
      [name, description, teacherId || null, classId]
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

export async function getAllClasses(): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.description, c.teacher_id, c.created_at,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       ORDER BY c.created_at DESC`
    )
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      studentCount: parseInt(row.student_count) || 0,
      createdAt: new Date(row.created_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getClassesForTeacher(teacherId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.description, c.teacher_id, c.created_at,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.teacher_id = $1
       ORDER BY c.created_at DESC`,
      [teacherId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      studentCount: parseInt(row.student_count) || 0,
      createdAt: new Date(row.created_at).getTime(),
    }))
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

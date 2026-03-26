import { getClient, base64ToBuffer, bufferToBase64 } from "./db"

type TextVisibility = 'class' | 'school' | 'public'

function rowToListItem(row: Record<string, unknown>): RepositoryTextListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) || "",
    previewText: ((row.extracted_text as string) || "").slice(0, 200),
    imageCount: Number(row.image_count ?? 0),
    schoolId: (row.school_id as string) || null,
    schoolName: (row.school_name as string) || null,
    visibility: (row.visibility as TextVisibility) || "school",
    createdBy: row.created_by as string,
    createdByName: (row.created_by_name as string) || null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

function rowToFull(
  row: Record<string, unknown>,
  images: Array<{ image_data: unknown; image_order: number; content_type: string }>
): RepositoryText {
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) || "",
    extractedText: (row.extracted_text as string) || "",
    originalImages: images
      .sort((a, b) => a.image_order - b.image_order)
      .map((img) => bufferToBase64(img.image_data as Buffer, img.content_type)),
    schoolId: (row.school_id as string) || null,
    visibility: (row.visibility as TextVisibility) || "school",
    createdBy: row.created_by as string,
    createdByName: (row.created_by_name as string) || null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id FROM classes WHERE teacher_id = $1`,
      [teacherId]
    )
    return result.rows.map(r => r.id)
  } finally {
    client.release()
  }
}

async function getStudentClassId(studentId: string): Promise<string | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT class_id FROM class_members WHERE student_id = $1`,
      [studentId]
    )
    return result.rows.length > 0 ? result.rows[0].class_id : null
  } finally {
    client.release()
  }
}

function buildVisibilityClause(
  role: string,
  userId: string,
  schoolId: string | null | undefined,
  teacherClassIds: string[],
  studentClassId: string | null,
  startParam: number
): { sql: string; values: unknown[] } {
  if (role === "super-admin") {
    return { sql: "1=1", values: [] }
  }
  
  if (role === "admin") {
    if (schoolId) {
      return {
        sql: `(tr.school_id = $${startParam} OR tr.visibility = 'public')`,
        values: [schoolId],
      }
    }
    return { sql: "tr.visibility = 'public'", values: [] }
  }
  
  if (role === "teacher") {
    const conditions: string[] = ["tr.visibility = 'public'"]
    const values: unknown[] = []
    let paramIdx = startParam
    
    if (schoolId) {
      conditions.push(`(tr.school_id = $${paramIdx} AND tr.visibility = 'school')`)
      values.push(schoolId)
      paramIdx++
    }
    
    if (teacherClassIds.length > 0) {
      conditions.push(`(tr.created_by = $${paramIdx} AND tr.visibility = 'class')`)
      values.push(userId)
      paramIdx++
    }
    
    return { sql: `(${conditions.join(" OR ")})`, values }
  }
  
  if (role === "student") {
    const conditions: string[] = ["tr.visibility = 'public'"]
    const values: unknown[] = []
    let paramIdx = startParam
    
    if (schoolId) {
      conditions.push(`(tr.school_id = $${paramIdx} AND tr.visibility = 'school')`)
      values.push(schoolId)
      paramIdx++
    }
    
    if (studentClassId) {
      conditions.push(`
        (tr.visibility = 'class' AND tr.created_by IN (
          SELECT teacher_id FROM classes WHERE id = $${paramIdx}
        ))
      `)
      values.push(studentClassId)
      paramIdx++
    }
    
    return { sql: `(${conditions.join(" OR ")})`, values }
  }
  
  return { sql: "tr.visibility = 'public'", values: [] }
}

export async function getRepositoryTexts(
  role: string,
  userId: string,
  schoolId?: string | null
): Promise<RepositoryTextListItem[]> {
  const client = await getClient()
  try {
    const teacherClassIds = role === 'teacher' ? await getTeacherClassIds(userId) : []
    const studentClassId = role === 'student' ? await getStudentClassId(userId) : null
    
    const { sql: vis, values } = buildVisibilityClause(role, userId, schoolId, teacherClassIds, studentClassId, 1)
    const result = await client.query(
      `SELECT
         tr.id,
         tr.name,
         tr.title,
         tr.extracted_text,
         tr.school_id,
         tr.visibility,
         tr.created_by,
         tr.created_at,
         tr.updated_at,
         u.name  AS created_by_name,
         s.name  AS school_name,
         COUNT(tri.id)::int AS image_count
       FROM text_repository tr
       LEFT JOIN users  u ON tr.created_by = u.id
       LEFT JOIN schools s ON tr.school_id = s.id
       LEFT JOIN text_repository_images tri ON tri.text_id = tr.id
       WHERE ${vis}
       GROUP BY tr.id, u.name, s.name
       ORDER BY tr.updated_at DESC`,
      values
    )
    return result.rows.map(rowToListItem)
  } finally {
    client.release()
  }
}

export async function getRepositoryText(
  id: string,
  role: string,
  userId: string,
  schoolId?: string | null
): Promise<RepositoryText | null> {
  const client = await getClient()
  try {
    const teacherClassIds = role === 'teacher' ? await getTeacherClassIds(userId) : []
    const studentClassId = role === 'student' ? await getStudentClassId(userId) : null
    
    const { sql: vis, values } = buildVisibilityClause(role, userId, schoolId, teacherClassIds, studentClassId, 2)
    const result = await client.query(
      `SELECT
         tr.*,
         u.name AS created_by_name
       FROM text_repository tr
       LEFT JOIN users u ON tr.created_by = u.id
       WHERE tr.id = $1 AND ${vis}`,
      [id, ...values]
    )
    if (result.rows.length === 0) return null

    const imgResult = await client.query(
      `SELECT image_data, image_order, content_type
       FROM text_repository_images
       WHERE text_id = $1
       ORDER BY image_order`,
      [id]
    )
    return rowToFull(result.rows[0] as Record<string, unknown>, imgResult.rows as Array<{ image_data: unknown; image_order: number; content_type: string }>)
  } finally {
    client.release()
  }
}

export async function createRepositoryText(
  createdBy: string,
  schoolId: string | null,
  data: {
    name: string
    title: string
    extractedText: string
    visibility: TextVisibility
    images: string[]
  }
): Promise<string> {
  const client = await getClient()
  try {
    await client.query("BEGIN")

    const result = await client.query(
      `INSERT INTO text_repository (name, title, extracted_text, school_id, visibility, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.name, data.title, data.extractedText, schoolId, data.visibility, createdBy]
    )
    const textId: string = result.rows[0].id

    for (let i = 0; i < data.images.length; i++) {
      const buf = base64ToBuffer(data.images[i])
      await client.query(
        `INSERT INTO text_repository_images (text_id, image_data, image_order, file_size)
         VALUES ($1, $2, $3, $4)`,
        [textId, buf, i, buf.length]
      )
    }

    await client.query("COMMIT")
    return textId
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function updateRepositoryText(
  id: string,
  userId: string,
  role: string,
  schoolId: string | null,
  data: {
    name?: string
    visibility?: TextVisibility
    title?: string
    extractedText?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient()
  try {
    const checkResult = await client.query(
      `SELECT created_by, school_id, visibility FROM text_repository WHERE id = $1`,
      [id]
    )
    
    if (checkResult.rows.length === 0) {
      return { success: false, error: "Not found" }
    }
    
    const text = checkResult.rows[0]
    const isOwner = text.created_by === userId
    const isSuperAdmin = role === "super-admin"
    const isAdmin = role === "admin"
    
    if (data.visibility !== undefined) {
      if (isSuperAdmin) {
        // Can set any visibility
      } else if (isAdmin && schoolId && text.school_id === schoolId) {
        if (data.visibility === 'public') {
          return { success: false, error: "Only super-admin can make texts public" }
        }
      } else if (isOwner) {
        if (data.visibility === 'public') {
          return { success: false, error: "Only super-admin can make texts public" }
        }
        if (data.visibility === 'school' && text.visibility === 'public') {
          return { success: false, error: "Cannot downgrade public text visibility" }
        }
      } else {
        return { success: false, error: "Forbidden" }
      }
    }
    
    if (!isOwner && !isSuperAdmin && !isAdmin) {
      return { success: false, error: "Forbidden" }
    }
    
    if (isAdmin && !isOwner && text.school_id !== schoolId) {
      return { success: false, error: "Forbidden" }
    }
    
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1

    if (data.name !== undefined) {
      if (!isOwner && !isSuperAdmin) {
        return { success: false, error: "Only owner or super-admin can rename" }
      }
      fields.push(`name = $${p++}`)
      values.push(data.name)
    }
    if (data.visibility !== undefined) {
      fields.push(`visibility = $${p++}`)
      values.push(data.visibility)
    }
    if (data.title !== undefined) {
      if (!isOwner && !isSuperAdmin) {
        return { success: false, error: "Only owner or super-admin can edit title" }
      }
      fields.push(`title = $${p++}`)
      values.push(data.title)
    }
    if (data.extractedText !== undefined) {
      if (!isOwner && !isSuperAdmin) {
        return { success: false, error: "Only owner or super-admin can edit text" }
      }
      fields.push(`extracted_text = $${p++}`)
      values.push(data.extractedText)
    }

    if (fields.length === 0) return { success: true }

    values.push(id)
    const result = await client.query(
      `UPDATE text_repository SET ${fields.join(", ")} WHERE id = $${p}`,
      values
    )
    return { success: (result.rowCount ?? 0) > 0 }
  } finally {
    client.release()
  }
}

export async function deleteRepositoryText(
  id: string,
  userId: string,
  role: string,
  schoolId: string | null
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient()
  try {
    const checkResult = await client.query(
      `SELECT created_by, school_id FROM text_repository WHERE id = $1`,
      [id]
    )
    
    if (checkResult.rows.length === 0) {
      return { success: false, error: "Not found" }
    }
    
    const text = checkResult.rows[0]
    const isOwner = text.created_by === userId
    const isSuperAdmin = role === "super-admin"
    const isAdmin = role === "admin"
    
    if (isOwner || isSuperAdmin) {
      const result = await client.query(
        `DELETE FROM text_repository WHERE id = $1`,
        [id]
      )
      return { success: (result.rowCount ?? 0) > 0 }
    }
    
    if (isAdmin && schoolId && text.school_id === schoolId) {
      const result = await client.query(
        `DELETE FROM text_repository WHERE id = $1`,
        [id]
      )
      return { success: (result.rowCount ?? 0) > 0 }
    }
    
    return { success: false, error: "Forbidden" }
  } finally {
    client.release()
  }
}

export async function canEditText(
  textId: string,
  userId: string,
  role: string,
  schoolId: string | null
): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT created_by, school_id FROM text_repository WHERE id = $1`,
      [textId]
    )
    
    if (result.rows.length === 0) return false
    
    const text = result.rows[0]
    
    if (text.created_by === userId) return true
    if (role === "super-admin") return true
    if (role === "admin" && schoolId && text.school_id === schoolId) return true
    
    return false
  } finally {
    client.release()
  }
}

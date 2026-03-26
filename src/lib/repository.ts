import { getClient, base64ToBuffer, bufferToBase64 } from "./db"

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function rowToListItem(row: Record<string, unknown>): RepositoryTextListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) || "",
    previewText: ((row.extracted_text as string) || "").slice(0, 200),
    imageCount: Number(row.image_count ?? 0),
    schoolId: (row.school_id as string) || null,
    schoolName: (row.school_name as string) || null,
    isPublic: Boolean(row.is_public),
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
    isPublic: Boolean(row.is_public),
    createdBy: row.created_by as string,
    createdByName: (row.created_by_name as string) || null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Access control
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the WHERE clause fragment (and params) that restrict results to texts
 * visible to the given user:
 *   - Admin: all texts (no restriction)
 *   - Others: own school's texts OR public texts
 */
function visibilityClause(
  role: string,
  schoolId: string | null | undefined,
  startParam: number
): { sql: string; values: unknown[] } {
  if (role === "super-admin" || role === "admin") {
    return { sql: "1=1", values: [] }
  }
  if (schoolId) {
    return {
      sql: `(tr.school_id = $${startParam} OR tr.is_public = TRUE)`,
      values: [schoolId],
    }
  }
  // No school – can only see public texts
  return { sql: "tr.is_public = TRUE", values: [] }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read operations
// ─────────────────────────────────────────────────────────────────────────────

export async function getRepositoryTexts(
  role: string,
  schoolId?: string | null
): Promise<RepositoryTextListItem[]> {
  const client = await getClient()
  try {
    const { sql: vis, values } = visibilityClause(role, schoolId, 1)
    const result = await client.query(
      `SELECT
         tr.id,
         tr.name,
         tr.title,
         tr.extracted_text,
         tr.school_id,
         tr.is_public,
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
  schoolId?: string | null
): Promise<RepositoryText | null> {
  const client = await getClient()
  try {
    const { sql: vis, values } = visibilityClause(role, schoolId, 2)
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

// ─────────────────────────────────────────────────────────────────────────────
// Write operations (admin-only callers enforce this at the API layer)
// ─────────────────────────────────────────────────────────────────────────────

export async function createRepositoryText(
  createdBy: string,
  schoolId: string | null,
  data: {
    name: string
    title: string
    extractedText: string
    isPublic: boolean
    images: string[] // base64 data URLs
  }
): Promise<string> {
  const client = await getClient()
  try {
    await client.query("BEGIN")

    const result = await client.query(
      `INSERT INTO text_repository (name, title, extracted_text, school_id, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.name, data.title, data.extractedText, schoolId, data.isPublic, createdBy]
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
  createdBy: string,
  role: string,
  data: {
    name?: string
    isPublic?: boolean
    title?: string
    extractedText?: string
  }
): Promise<boolean> {
  const client = await getClient()
  try {
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1

    if (data.name !== undefined) {
      fields.push(`name = $${p++}`)
      values.push(data.name)
    }
    if (data.isPublic !== undefined) {
      fields.push(`is_public = $${p++}`)
      values.push(data.isPublic)
    }
    if (data.title !== undefined) {
      fields.push(`title = $${p++}`)
      values.push(data.title)
    }
    if (data.extractedText !== undefined) {
      fields.push(`extracted_text = $${p++}`)
      values.push(data.extractedText)
    }

    if (fields.length === 0) return true

    values.push(id)
    // Admins and super-admins can edit any text; others can only edit their own
    const isPrivileged = role === "super-admin" || role === "admin"
    const ownerCheck = isPrivileged ? "" : ` AND created_by = $${p + 1}`
    if (!isPrivileged) values.push(createdBy)

    const result = await client.query(
      `UPDATE text_repository SET ${fields.join(", ")} WHERE id = $${p}${ownerCheck}`,
      values
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteRepositoryText(
  id: string,
  createdBy: string,
  role: string
): Promise<boolean> {
  const client = await getClient()
  try {
    // Admins and super-admins can delete any text; others only their own
    const isPrivileged = role === "super-admin" || role === "admin"
    const ownerCheck = isPrivileged ? "" : " AND created_by = $2"
    const values: unknown[] = isPrivileged ? [id] : [id, createdBy]
    const result = await client.query(
      `DELETE FROM text_repository WHERE id = $1${ownerCheck}`,
      values
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

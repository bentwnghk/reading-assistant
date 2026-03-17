import { getClient } from "./db"
import crypto from "crypto"

export interface ChatQuestion {
  id: string
  questionHash: string
  questionText: string
  normalizedText: string
  userId: string
  sessionId?: string | null
  docTitle?: string | null
  responseText?: string | null
  createdAt: number
}

export interface AggregatedQuestion {
  questionHash: string
  questionText: string
  frequency: number
  lastAsked: number
  uniqueUserCount: number
}

export interface QuestionInstance {
  id: string
  questionText: string
  responseText?: string | null
  docTitle?: string | null
  createdAt: number
  userId: string
  userName?: string | null
  userEmail?: string | null
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function hashQuestion(text: string): string {
  const normalized = normalizeQuestion(text)
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16)
}

export async function logChatQuestion(
  userId: string,
  questionText: string,
  responseText: string,
  options: {
    sessionId?: string
    docTitle?: string
  } = {}
): Promise<void> {
  const client = await getClient()
  try {
    const normalizedText = normalizeQuestion(questionText)
    const questionHash = hashQuestion(questionText)

    await client.query(
      `INSERT INTO chat_questions (question_hash, question_text, normalized_text, user_id, session_id, doc_title, response_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        questionHash,
        questionText,
        normalizedText,
        userId,
        options.sessionId ?? null,
        options.docTitle ?? null,
        responseText,
      ]
    )
  } catch (error) {
    console.error("[chatQuestions] Failed to log question:", error)
  } finally {
    client.release()
  }
}

export async function getAggregatedQuestions(options: {
  schoolId?: string
  classId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ questions: AggregatedQuestion[]; total: number }> {
  const client = await getClient()
  try {
    const conditions: string[] = []
    const params: (string | Date | number)[] = []
    let paramIndex = 1

    if (options.startDate) {
      conditions.push(`cq.created_at >= $${paramIndex}`)
      params.push(options.startDate)
      paramIndex++
    }

    if (options.endDate) {
      conditions.push(`cq.created_at < $${paramIndex}`)
      params.push(options.endDate)
      paramIndex++
    }

    if (options.schoolId) {
      conditions.push(`u.school_id = $${paramIndex}`)
      params.push(options.schoolId)
      paramIndex++
    }

    if (options.classId) {
      conditions.push(`cm.class_id = $${paramIndex}`)
      params.push(options.classId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}` 
      : ""

    const countResult = await client.query(
      `SELECT COUNT(DISTINCT cq.question_hash) as total
       FROM chat_questions cq
       LEFT JOIN users u ON cq.user_id = u.id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       ${whereClause}`,
      params
    )

    const total = parseInt(countResult.rows[0]?.total || "0", 10)

    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    const result = await client.query(
      `SELECT 
        cq.question_hash,
        cq.question_text,
        COUNT(*) as frequency,
        MAX(cq.created_at) as last_asked,
        COUNT(DISTINCT cq.user_id) as unique_user_count
       FROM chat_questions cq
       LEFT JOIN users u ON cq.user_id = u.id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       ${whereClause}
       GROUP BY cq.question_hash, cq.normalized_text
       ORDER BY frequency DESC, last_asked DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    const questions: AggregatedQuestion[] = result.rows.map((row) => ({
      questionHash: row.question_hash,
      questionText: row.question_text,
      frequency: parseInt(row.frequency, 10),
      lastAsked: new Date(row.last_asked).getTime(),
      uniqueUserCount: parseInt(row.unique_user_count, 10),
    }))

    return { questions, total }
  } finally {
    client.release()
  }
}

export async function getQuestionInstances(
  questionHash: string,
  options: {
    schoolId?: string
    classId?: string
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<QuestionInstance[]> {
  const client = await getClient()
  try {
    const conditions: string[] = ["cq.question_hash = $1"]
    const params: (string | Date)[] = [questionHash]
    let paramIndex = 2

    if (options.startDate) {
      conditions.push(`cq.created_at >= $${paramIndex}`)
      params.push(options.startDate)
      paramIndex++
    }

    if (options.endDate) {
      conditions.push(`cq.created_at < $${paramIndex}`)
      params.push(options.endDate)
      paramIndex++
    }

    if (options.schoolId) {
      conditions.push(`u.school_id = $${paramIndex}`)
      params.push(options.schoolId)
      paramIndex++
    }

    if (options.classId) {
      conditions.push(`cm.class_id = $${paramIndex}`)
      params.push(options.classId)
      paramIndex++
    }

    const result = await client.query(
      `SELECT 
        cq.id,
        cq.question_text,
        cq.response_text,
        cq.doc_title,
        cq.created_at,
        cq.user_id,
        u.name as user_name,
        u.email as user_email
       FROM chat_questions cq
       LEFT JOIN users u ON cq.user_id = u.id
       LEFT JOIN class_members cm ON u.id = cm.student_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY cq.created_at DESC`,
      params
    )

    return result.rows.map((row) => ({
      id: row.id,
      questionText: row.question_text,
      responseText: row.response_text,
      docTitle: row.doc_title,
      createdAt: new Date(row.created_at).getTime(),
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
    }))
  } finally {
    client.release()
  }
}

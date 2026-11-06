import { getPool } from "./db"
import { LANGUAGE_CHECK_MAX_TOPICS } from "@/constants/languageCheck"

function toMs(value: unknown): number {
  return value ? new Date(value as string).getTime() : 0
}

function mapSummary(row: Record<string, unknown>): LanguageCheckTopicSummary {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    topic: (row.topic as string) || "",
    essayType: row.essay_type as LanguageCheckEssayTypeId,
    hasQuestionImage: !!row.has_image,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

/** Lightweight list: the question image itself is never selected. */
export async function listTopics(
  userId: string,
): Promise<LanguageCheckTopicSummary[]> {
  const { rows } = await getPool().query(
    `SELECT id, title, topic, essay_type, created_at, updated_at,
            (question_image <> '') AS has_image
     FROM language_check_topics
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, LANGUAGE_CHECK_MAX_TOPICS],
  )
  return rows.map(mapSummary)
}

export async function getTopic(
  userId: string,
  id: string,
): Promise<LanguageCheckTopic | null> {
  const { rows } = await getPool().query(
    `SELECT id, title, topic, essay_type, question_image, created_at, updated_at,
            (question_image <> '') AS has_image
     FROM language_check_topics
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  if (!rows[0]) return null
  return { ...mapSummary(rows[0]), questionImage: rows[0].question_image || "" }
}

export async function countTopics(userId: string): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM language_check_topics WHERE user_id = $1`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function createTopic(
  userId: string,
  data: {
    title: string
    topic: string
    essayType: LanguageCheckEssayTypeId
    questionImage: string
  },
): Promise<LanguageCheckTopic> {
  const { rows } = await getPool().query(
    `INSERT INTO language_check_topics (user_id, title, topic, essay_type, question_image)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, data.title, data.topic, data.essayType, data.questionImage],
  )
  return (await getTopic(userId, rows[0].id as string))!
}

export async function updateTopic(
  userId: string,
  id: string,
  data: {
    title: string
    topic: string
    essayType: LanguageCheckEssayTypeId
    questionImage: string
  },
): Promise<LanguageCheckTopic | null> {
  const result = await getPool().query(
    `UPDATE language_check_topics
     SET title = $3, topic = $4, essay_type = $5, question_image = $6
     WHERE id = $1 AND user_id = $2`,
    [id, userId, data.title, data.topic, data.essayType, data.questionImage],
  )
  if ((result.rowCount ?? 0) === 0) return null
  return getTopic(userId, id)
}

/** Essays keep their own snapshot, so deleting a topic never alters them. */
export async function deleteTopic(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM language_check_topics WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  return (result.rowCount ?? 0) > 0
}

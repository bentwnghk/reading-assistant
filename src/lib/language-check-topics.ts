import { getPool } from "./db"
import { getSchoolForUser } from "./users"
import { LANGUAGE_CHECK_MAX_TOPICS } from "@/constants/languageCheck"

/** Viewer context for topic visibility / class targeting. */
export interface TopicViewer {
  id: string
  role: string
}

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
    userId: (row.user_id as string) || "",
    classId: (row.class_id as string) || null,
    className: (row.class_name as string) || null,
    creatorName: (row.creator_name as string) || null,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

/**
 * Shared SELECT (+ joins) for topic reads. `extra` appends further select
 * items (the full-topic `question_image`) BEFORE the FROM clause — the list
 * query never selects the image (lightweight/full split).
 */
function topicSelect(extra: string): string {
  return `SELECT t.id, t.title, t.topic, t.essay_type, t.created_at, t.updated_at,
       (t.question_image <> '') AS has_image,
       t.user_id, t.class_id,
       concat_ws(' · ', g.name, sub.name, c.name) AS class_name,
       CASE WHEN t.user_id = $VIEWER THEN '' ELSE COALESCE(cu.name, '') END AS creator_name${extra}
FROM language_check_topics t
LEFT JOIN classes c ON c.id = t.class_id
LEFT JOIN subjects sub ON sub.id = c.subject_id
LEFT JOIN grades g ON g.id = c.grade_id
LEFT JOIN users cu ON cu.id = t.user_id`
}

/**
 * SQL selecting the ids of the classes whose topics the viewer may see —
 * mirrors GET /api/classes: student → classes they belong to, teacher →
 * classes they teach, admin → classes in their school, super-admin → all.
 * `$N` placeholders start at `start`.
 */
async function visibleClassIds(
  viewer: TopicViewer,
  start: number,
): Promise<{ sql: string; params: unknown[] }> {
  if (viewer.role === "super-admin") {
    return { sql: `SELECT id FROM classes`, params: [] }
  }
  if (viewer.role === "teacher") {
    return {
      sql: `SELECT id FROM classes WHERE teacher_id = $${start}`,
      params: [viewer.id],
    }
  }
  if (viewer.role === "admin") {
    const schoolId = await getSchoolForUser(viewer.id)
    if (!schoolId) return { sql: `SELECT id FROM classes WHERE FALSE`, params: [] }
    return {
      sql: `SELECT id FROM classes WHERE school_id = $${start}`,
      params: [schoolId],
    }
  }
  return {
    sql: `SELECT class_id FROM class_members WHERE student_id = $${start}`,
    params: [viewer.id],
  }
}

/**
 * Lightweight list: the viewer's OWN topics plus topics created for the
 * classes they are in / teach / supervise. Own topics come first so the
 * LANGUAGE_CHECK_MAX_TOPICS cap can never push them off (the per-user
 * create limit also counts own topics only). The question image itself is
 * never selected.
 */
export async function listTopics(
  viewer: TopicViewer,
): Promise<LanguageCheckTopicSummary[]> {
  const params: unknown[] = [viewer.id]
  const scope = await visibleClassIds(viewer, 2)
  params.push(...scope.params)
  const { rows } = await getPool().query(
    `${topicSelect("").replace(/\$VIEWER/g, "$1")}
     WHERE t.user_id = $1 OR t.class_id IN (${scope.sql})
     ORDER BY (t.user_id = $1) DESC, t.updated_at DESC
     LIMIT ${LANGUAGE_CHECK_MAX_TOPICS}`,
    params,
  )
  return rows.map(mapSummary)
}

/** Full topic (incl. question image); readable by the creator and anyone who can see its class. */
export async function getTopic(
  viewer: TopicViewer,
  id: string,
): Promise<LanguageCheckTopic | null> {
  const params: unknown[] = [id, viewer.id]
  const scope = await visibleClassIds(viewer, 3)
  params.push(...scope.params)
  const { rows } = await getPool().query(
    `${topicSelect(", t.question_image").replace(/\$VIEWER/g, "$2")}
     WHERE t.id = $1 AND (t.user_id = $2 OR t.class_id IN (${scope.sql}))`,
    params,
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

/**
 * May the viewer create/edit a topic targeting this class? Mirrors the
 * visibility scope: students target classes they belong to, teachers the
 * classes they teach, admins the classes in their school, super-admins any
 * class. A missing class id fails (no orphan targets).
 */
export async function canAssignTopicClass(
  viewer: TopicViewer,
  classId: string,
): Promise<boolean> {
  if (viewer.role === "super-admin") {
    const { rowCount } = await getPool().query(
      `SELECT 1 FROM classes WHERE id = $1`,
      [classId],
    )
    return (rowCount ?? 0) > 0
  }
  const clauses: string[] = []
  const params: unknown[] = []
  if (viewer.role === "teacher") {
    params.push(viewer.id)
    clauses.push(`c.teacher_id = $${params.length}`)
  } else if (viewer.role === "admin") {
    const schoolId = await getSchoolForUser(viewer.id)
    if (!schoolId) return false
    params.push(schoolId)
    clauses.push(`c.school_id = $${params.length}`)
  } else {
    params.push(viewer.id)
    clauses.push(
      `EXISTS (
        SELECT 1 FROM class_members tcm
        WHERE tcm.class_id = c.id AND tcm.student_id = $${params.length}
      )`,
    )
  }
  params.push(classId)
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM classes c WHERE c.id = $${params.length} AND ${clauses.join(" AND ")}`,
    params,
  )
  return (rowCount ?? 0) > 0
}

export interface TopicInput {
  title: string
  topic: string
  essayType: LanguageCheckEssayTypeId
  questionImage: string
  classId: string | null
}

/** Read-back after a write: the creator sees their own topic regardless of role. */
async function getOwnedTopic(
  userId: string,
  id: string,
): Promise<LanguageCheckTopic | null> {
  const { rows } = await getPool().query(
    `${topicSelect(", t.question_image").replace(/\$VIEWER/g, "$2")}
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, userId],
  )
  if (!rows[0]) return null
  return { ...mapSummary(rows[0]), questionImage: rows[0].question_image || "" }
}

export async function createTopic(
  userId: string,
  data: TopicInput,
): Promise<LanguageCheckTopic> {
  const { rows } = await getPool().query(
    `INSERT INTO language_check_topics (user_id, title, topic, essay_type, question_image, class_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, data.title, data.topic, data.essayType, data.questionImage, data.classId],
  )
  return (await getOwnedTopic(userId, rows[0].id as string))!
}

/** Only the creator may edit their topic (even class-assigned ones). */
export async function updateTopic(
  userId: string,
  id: string,
  data: TopicInput,
): Promise<LanguageCheckTopic | null> {
  const result = await getPool().query(
    `UPDATE language_check_topics
     SET title = $3, topic = $4, essay_type = $5, question_image = $6, class_id = $7
     WHERE id = $1 AND user_id = $2`,
    [id, userId, data.title, data.topic, data.essayType, data.questionImage, data.classId],
  )
  if ((result.rowCount ?? 0) === 0) return null
  return getOwnedTopic(userId, id)
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

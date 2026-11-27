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
export async function visibleClassIds(
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

/**
 * Admins and super-admins have the widened write scope (see
 * `topicWriteScope`); everyone else only ever touches their own topics.
 */
function managesLibrary(role: string): boolean {
  return role === "admin" || role === "super-admin"
}

/**
 * Who may edit or delete a topic, as a predicate over `language_check_topics`
 * (no table alias — it is used directly in UPDATE / DELETE): always the
 * creator — plus, for admins and super-admins, everything the Topic reports
 * tabs can surface to them. Those tabs are essay-driven and DO show topics
 * the library list hides, so the write scope is deliberately WIDER than
 * `listTopics`:
 *
 *  - classed topics of the classes they supervise (the same `visibleClassIds`
 *    scope the library list uses), and
 *  - UNCLASSED ("No class") topics — a NULL class_id matches no class scope,
 *    yet a report appears for one as soon as an in-scope student writes on
 *    it. Admins reach unclassed topics created by users in their school;
 *    super-admins reach every topic, classed or not.
 *
 * Teachers and students keep creator-only rights. Placeholders start at
 * `start`.
 */
async function topicWriteScope(
  viewer: TopicViewer,
  start: number,
): Promise<{ sql: string; params: unknown[] }> {
  if (!managesLibrary(viewer.role)) {
    return { sql: `user_id = $${start}`, params: [viewer.id] }
  }
  if (viewer.role === "super-admin") {
    // Every topic: classed (any class) or unclassed.
    return {
      sql: `(class_id IS NULL OR class_id IN (SELECT id FROM classes))`,
      params: [],
    }
  }
  const schoolId = await getSchoolForUser(viewer.id)
  if (!schoolId) return { sql: `user_id = $${start}`, params: [viewer.id] }
  const scope = await visibleClassIds(viewer, start + 1)
  const schoolParam = `$${start + 1 + scope.params.length}`
  return {
    sql: `(user_id = $${start} OR class_id IN (${scope.sql})
          OR (class_id IS NULL AND user_id IN (SELECT id FROM users WHERE school_id = ${schoolParam})))`,
    params: [viewer.id, ...scope.params, schoolId],
  }
}

/**
 * Read-back after a write. Unscoped ON PURPOSE: it only ever runs right
 * after an authorised INSERT / UPDATE touched this row, and that very write
 * may have moved the row out of the writer's library (an admin making
 * another user's class topic personal). `viewerId` only drives the creator
 * label, exactly like the list query.
 */
async function readBackTopic(
  viewerId: string,
  id: string,
): Promise<LanguageCheckTopic | null> {
  const { rows } = await getPool().query(
    `${topicSelect(", t.question_image").replace(/\$VIEWER/g, "$2")}
     WHERE t.id = $1`,
    [id, viewerId],
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
  return (await readBackTopic(userId, rows[0].id as string))!
}

/**
 * The creator may edit their topic; admins and super-admins also any topic
 * the widened `topicWriteScope` reaches (school-surfaced classed topics,
 * unclassed topics created in their school; super-admins everything).
 * Editing never changes ownership — the creator stays the creator. Null
 * when the topic does not exist or is out of the caller's scope.
 */
export async function updateTopic(
  viewer: TopicViewer,
  id: string,
  data: TopicInput,
): Promise<LanguageCheckTopic | null> {
  // The data placeholders come first so their positions never depend on the
  // caller's role (the scope adds a param for admins only).
  const values: unknown[] = [
    data.title,
    data.topic,
    data.essayType,
    data.questionImage,
    data.classId,
    id,
  ]
  const scope = await topicWriteScope(viewer, values.length + 1)
  values.push(...scope.params)
  const result = await getPool().query(
    `UPDATE language_check_topics
     SET title = $1, topic = $2, essay_type = $3, question_image = $4, class_id = $5
     WHERE id = $6 AND ${scope.sql}`,
    values,
  )
  if ((result.rowCount ?? 0) === 0) return null
  return readBackTopic(viewer.id, id)
}

/**
 * Essays keep their own snapshot, so deleting a topic never alters them.
 * Same right as `updateTopic`: the creator, or an admin / super-admin under
 * the widened `topicWriteScope` (so the "No class" reports the tabs surface
 * are deletable too).
 */
export async function deleteTopic(
  viewer: TopicViewer,
  id: string,
): Promise<boolean> {
  const scope = await topicWriteScope(viewer, 2)
  const result = await getPool().query(
    `DELETE FROM language_check_topics WHERE id = $1 AND ${scope.sql}`,
    [id, ...scope.params],
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * May the viewer delete this topic? One read over the exact `deleteTopic`
 * scope (the widened `topicWriteScope` — see there), so the report route can
 * mirror the affordance the server will enforce — the button never promises
 * a delete that answers 404.
 */
export async function canDeleteTopic(
  viewer: TopicViewer,
  id: string,
): Promise<boolean> {
  const scope = await topicWriteScope(viewer, 2)
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM language_check_topics WHERE id = $1 AND ${scope.sql}`,
    [id, ...scope.params],
  )
  return (rowCount ?? 0) > 0
}

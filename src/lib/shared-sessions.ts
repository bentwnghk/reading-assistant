import { getClient } from "./db"
import { createReadingSession } from "./sessions"
import { getSchoolForUser, getClassesForTeacher, getClassMembers, getStudentClassIds, getUsersInSchool, getAllSchools } from "./users"
import type { ReadingStore } from "@/store/reading"
import type { UserRole, ClassMember } from "./users"

export interface SharedSession {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  sessionId: string
  docTitle: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

export interface ShareTarget {
  id: string
  name: string | null
  email: string | null
  classId?: string
  className?: string
  schoolId?: string
  schoolName?: string
}

export interface ShareTargetGroup {
  classId?: string
  className?: string
  schoolId?: string
  schoolName?: string
  label: string
  users: ShareTarget[]
}

function stripUserData(sessionData: ReadingStore): Record<string, unknown> {
  const stripped = {
    ...sessionData,
    readingTest: Array.isArray(sessionData.readingTest)
      ? sessionData.readingTest.map((q) => {
          const clean: Record<string, unknown> = { ...q }
          delete clean.userAnswer
          delete clean.earnedPoints
          return clean
        })
      : sessionData.readingTest,
    grammarQuiz: Array.isArray(sessionData.grammarQuiz)
      ? sessionData.grammarQuiz.map((q) => {
          const clean: Record<string, unknown> = { ...q }
          delete clean.userAnswer
          delete clean.earnedPoints
          return clean
        })
      : sessionData.grammarQuiz,
    testScore: 0,
    testCompleted: false,
    testEarnedPoints: 0,
    testsCompleted: 0,
    vocabularyQuizScore: 0,
    vocabularyQuiz: [],
    vocabQuizzesCompleted: 0,
    spellingGameBestScore: 0,
    spellingGameAccuracy: 0,
    spellingGamesCompleted: 0,
    grammarQuizScore: 0,
    grammarQuizCompleted: false,
    grammarQuizzesCompleted: 0,
    grammarQuizEarnedPoints: 0,
    grammarQuizTotalPoints: 0,
    grammarScrambleHighScore: 0,
    grammarWorkshopHighScore: 0,
    grammarSurgeryHighScore: 0,
    grammarRouletteHighScore: 0,
    grammarDuelHighScore: 0,
    grammarScrambleAccuracy: 0,
    grammarWorkshopAccuracy: 0,
    grammarSurgeryAccuracy: 0,
    grammarRouletteAccuracy: 0,
    grammarDuelAccuracy: 0,
    grammarGameAccuracy: 0,
    grammarScrambleCompleted: 0,
    grammarWorkshopCompleted: 0,
    grammarSurgeryCompleted: 0,
    grammarRouletteCompleted: 0,
    grammarDuelCompleted: 0,
    grammarGamesCompleted: 0,
    flashcardReviewDates: [],
    glossaryRatings: {},
    chatHistory: [],
    // Pre-reading: content (preReading) is kept; user prediction is zeroed
    studentPrediction: "",
    predictionRating: null,
    status: "idle",
    error: null,
  }
  delete (stripped as Record<string, unknown>).id
  delete (stripped as Record<string, unknown>).createdAt
  delete (stripped as Record<string, unknown>).updatedAt
  return stripped
}

export async function createSharedSessions(
  senderId: string,
  recipientIds: string[],
  sessionId: string,
  sessionData: ReadingStore
): Promise<number> {
  const client = await getClient()
  const stripped = stripUserData(sessionData)

  try {
    let inserted = 0
    for (const recipientId of recipientIds) {
      if (recipientId === senderId) continue
      const result = await client.query(
        `INSERT INTO shared_sessions (sender_id, recipient_id, session_id, session_data, doc_title)
         VALUES ($1, $2, $3, $4, $5)`,
        [senderId, recipientId, sessionId, JSON.stringify(stripped), sessionData.docTitle || ""]
      )
      inserted += result.rowCount ?? 0
    }
    return inserted
  } finally {
    client.release()
  }
}

export async function getPendingShares(recipientId: string): Promise<SharedSession[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT ss.id, ss.sender_id, u.name as sender_name, ss.recipient_id,
              ss.session_id, ss.doc_title, ss.status, ss.created_at
       FROM shared_sessions ss
       JOIN users u ON ss.sender_id = u.id
       WHERE ss.recipient_id = $1 AND ss.status = 'pending'
       ORDER BY ss.created_at DESC`,
      [recipientId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name || row.sender_id,
      recipientId: row.recipient_id,
      sessionId: row.session_id,
      docTitle: row.doc_title,
      status: row.status,
      createdAt: row.created_at,
    }))
  } finally {
    client.release()
  }
}

export async function getPendingShareCount(recipientId: string): Promise<number> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int as count FROM shared_sessions WHERE recipient_id = $1 AND status = 'pending'`,
      [recipientId]
    )
    return result.rows[0]?.count ?? 0
  } finally {
    client.release()
  }
}

export async function acceptSharedSession(
  shareId: string,
  recipientId: string
): Promise<ReadingStore | null> {
  const client = await getClient()
  try {
    await client.query("BEGIN")

    const shareResult = await client.query(
      `SELECT session_data, doc_title FROM shared_sessions
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'
       FOR UPDATE`,
      [shareId, recipientId]
    )

    if (shareResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return null
    }

    const sessionData: Record<string, unknown> = shareResult.rows[0].session_data
    const { nanoid } = await import("nanoid")
    const newId = nanoid()
    const now = Date.now()

    const fullSession: ReadingStore = {
      ...sessionData,
      id: newId,
      source: "shared",
      createdAt: now,
      updatedAt: now,
    } as ReadingStore

    await createReadingSession(recipientId, fullSession)

    await client.query(
      `UPDATE shared_sessions SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [shareId]
    )

    await client.query("COMMIT")
    return fullSession
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function rejectSharedSession(
  shareId: string,
  recipientId: string
): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE shared_sessions SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'`,
      [shareId, recipientId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

// Expands a user's memberships into (classId, className) groups.
// Users may belong to multiple classes — they appear once per class group;
// recipient Sets in the UI dedupe across groups.
function userClassPairs(u: {
  classId?: string
  className?: string
  classIds?: string[]
  classNames?: string[]
}): Array<{ classId: string; className: string }> {
  const ids = u.classIds && u.classIds.length > 0 ? u.classIds : (u.classId ? [u.classId] : [])
  const names = u.classNames && u.classNames.length > 0 ? u.classNames : (u.className ? [u.className] : [])
  const pairs: Array<{ classId: string; className: string }> = []
  for (let i = 0; i < ids.length; i++) {
    pairs.push({ classId: ids[i], className: names[i] ?? ids[i] })
  }
  return pairs
}

function groupTargetsByClass(
  targets: ShareTarget[],
  groupMeta: { schoolId?: string; schoolName?: string }
): ShareTargetGroup[] {
  const groups: Record<string, { className: string; users: ShareTarget[] }> = {}
  const ungrouped: ShareTarget[] = []

  for (const t of targets) {
    if (t.classId && t.className) {
      if (!groups[t.classId]) groups[t.classId] = { className: t.className, users: [] }
      groups[t.classId].users.push(t)
    } else {
      ungrouped.push(t)
    }
  }

  const result: ShareTargetGroup[] = []
  for (const [classId, entry] of Object.entries(groups).sort((a, b) =>
    a[1].className.localeCompare(b[1].className)
  )) {
    result.push({
      classId,
      className: entry.className,
      schoolId: groupMeta.schoolId,
      schoolName: groupMeta.schoolName,
      label: entry.className || classId,
      users: entry.users,
    })
  }
  if (ungrouped.length > 0) {
    result.push({
      schoolId: groupMeta.schoolId,
      schoolName: groupMeta.schoolName,
      label: "Other",
      users: ungrouped,
    })
  }
  return result
}

export async function getShareTargets(
  userId: string,
  role: UserRole
): Promise<ShareTargetGroup[]> {
  if (role === "super-admin") {
    const schools = await getAllSchools()
    const result: ShareTargetGroup[] = []

    for (const school of schools) {
      const users = await getUsersInSchool(school.id)
      const targets: ShareTarget[] = []
      for (const u of users) {
        if (u.id === userId || u.banned) continue
        const pairs = userClassPairs(u)
        if (pairs.length === 0) {
          targets.push({
            id: u.id,
            name: u.name ?? null,
            email: u.email ?? null,
            schoolId: school.id,
            schoolName: school.name,
          })
        } else {
          for (const p of pairs) {
            targets.push({
              id: u.id,
              name: u.name ?? null,
              email: u.email ?? null,
              classId: p.classId,
              className: p.className,
              schoolId: school.id,
              schoolName: school.name,
            })
          }
        }
      }

      if (targets.length === 0) continue
      result.push(...groupTargetsByClass(targets, { schoolId: school.id, schoolName: school.name }))
    }

    return result
  }

  if (role === "admin") {
    const schoolId = await getSchoolForUser(userId)
    if (!schoolId) return []
    const users = await getUsersInSchool(schoolId)
    const targets: ShareTarget[] = []
    for (const u of users) {
      if (u.id === userId || u.banned) continue
      const pairs = userClassPairs(u)
      if (pairs.length === 0) {
        targets.push({
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? null,
        })
      } else {
        for (const p of pairs) {
          targets.push({
            id: u.id,
            name: u.name ?? null,
            email: u.email ?? null,
            classId: p.classId,
            className: p.className,
          })
        }
      }
    }

    if (targets.length === 0) return []
    return groupTargetsByClass(targets, {})
  }

  if (role === "teacher") {
    const classes = await getClassesForTeacher(userId)
    const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name))
    const result: ShareTargetGroup[] = []

    for (const cls of sortedClasses) {
      const members: ClassMember[] = await getClassMembers(cls.id)
      const targets: ShareTarget[] = members.map((m) => ({
        id: m.studentId,
        name: m.studentName ?? null,
        email: m.studentEmail ?? null,
        classId: cls.id,
        className: cls.name,
      }))
      if (targets.length > 0) {
        result.push({
          classId: cls.id,
          className: cls.name,
          label: cls.name,
          users: targets,
        })
      }
    }
    return result
  }

  if (role === "student") {
    // Union of classmates across ALL the student's classes (deduped, self excluded).
    const classIds = await getStudentClassIds(userId)
    if (classIds.length === 0) return []

    const client = await getClient()
    try {
      const result: ShareTargetGroup[] = []
      const seen = new Set<string>()

      const classesResult = await client.query(
        `SELECT id, name FROM classes WHERE id = ANY($1)`,
        [classIds]
      )
      const classNameById = new Map<string, string>(
        classesResult.rows.map((row: Record<string, unknown>) => [row.id as string, row.name as string])
      )

      for (const classId of classIds) {
        const members: ClassMember[] = await getClassMembers(classId)
        const targets: ShareTarget[] = []
        for (const m of members) {
          if (m.studentId === userId || seen.has(m.studentId)) continue
          seen.add(m.studentId)
          targets.push({
            id: m.studentId,
            name: m.studentName ?? null,
            email: m.studentEmail ?? null,
            classId,
            className: classNameById.get(classId),
          })
        }
        if (targets.length > 0) {
          const className = classNameById.get(classId)
          result.push({
            classId,
            className,
            label: className || classId,
            users: targets,
          })
        }
      }
      return result
    } finally {
      client.release()
    }
  }

  return []
}

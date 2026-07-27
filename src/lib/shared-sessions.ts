import { getClient } from "./db"
import { createReadingSession } from "./sessions"
import { getSchoolForUser, getClassesForTeacher, getClassMembers, getStudentClassId, getUsersInSchool, getAllSchools } from "./users"
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

export async function getShareTargets(
  userId: string,
  role: UserRole
): Promise<ShareTargetGroup[]> {
  if (role === "super-admin") {
    const schools = await getAllSchools()
    const result: ShareTargetGroup[] = []

    for (const school of schools) {
      const users = await getUsersInSchool(school.id)
      const targets = users
        .filter((u) => u.id !== userId)
        .map((u) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? null,
          classId: u.classId ?? undefined,
          className: u.className ?? undefined,
          schoolId: school.id,
          schoolName: school.name,
        }))

      if (targets.length === 0) continue

      const groupedByClass: Record<string, ShareTarget[]> = {}
      const ungrouped: ShareTarget[] = []

      for (const t of targets) {
        if (t.classId && t.className) {
          if (!groupedByClass[t.classId]) groupedByClass[t.classId] = []
          groupedByClass[t.classId].push(t)
        } else {
          ungrouped.push(t)
        }
      }

      for (const [classId, clsUsers] of Object.entries(groupedByClass)) {
        result.push({
          classId,
          className: clsUsers[0].className,
          schoolId: school.id,
          schoolName: school.name,
          label: clsUsers[0].className || classId,
          users: clsUsers,
        })
      }

      if (ungrouped.length > 0) {
        result.push({
          schoolId: school.id,
          schoolName: school.name,
          label: "Other",
          users: ungrouped,
        })
      }
    }

    return result
  }

  if (role === "admin") {
    const schoolId = await getSchoolForUser(userId)
    if (!schoolId) return []
    const users = await getUsersInSchool(schoolId)
    const targets = users
      .filter((u) => u.id !== userId)
      .map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        classId: u.classId ?? undefined,
        className: u.className ?? undefined,
      }))

    if (targets.length === 0) return []

    const groups: Record<string, ShareTarget[]> = {}
    const ungrouped: ShareTarget[] = []

    for (const t of targets) {
      if (t.classId && t.className) {
        if (!groups[t.classId]) groups[t.classId] = []
        groups[t.classId].push(t)
      } else {
        ungrouped.push(t)
      }
    }

    const result: ShareTargetGroup[] = []
    for (const [classId, users] of Object.entries(groups)) {
      result.push({
        classId,
        className: users[0].className,
        label: users[0].className || classId,
        users,
      })
    }
    if (ungrouped.length > 0) {
      result.push({ label: "Other", users: ungrouped })
    }
    return result
  }

  if (role === "teacher") {
    const classes = await getClassesForTeacher(userId)
    const result: ShareTargetGroup[] = []

    for (const cls of classes) {
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
    const classId = await getStudentClassId(userId)
    if (!classId) return []
    const members: ClassMember[] = await getClassMembers(classId)
    const targets: ShareTarget[] = members
      .filter((m) => m.studentId !== userId)
      .map((m) => ({
        id: m.studentId,
        name: m.studentName ?? null,
        email: m.studentEmail ?? null,
        classId,
      }))

    if (targets.length === 0) return []

    const client = await getClient()
    try {
      const classResult = await client.query(
        `SELECT name FROM classes WHERE id = $1`,
        [classId]
      )
      const className = classResult.rows[0]?.name
      return [
        {
          classId,
          className: className ?? undefined,
          label: className || classId,
          users: targets,
        },
      ]
    } finally {
      client.release()
    }
  }

  return []
}

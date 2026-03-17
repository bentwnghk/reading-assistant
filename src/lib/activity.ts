import { getClient } from "./db"

export type ActivityType =
  | "session_create"
  | "test_complete"
  | "quiz_complete"
  | "spelling_complete"
  | "flashcard_review"
  | "mindmap_generate"
  | "adapted_text_generate"
  | "simplified_text_generate"
  | "sentence_analyze"
  | "targeted_practice_complete"
  | "glossary_add"
  | "ai_tutor_question"

export interface ActivityDetails {
  cardsReviewed?: number
  wordCount?: number
  mode?: string
  difficulty?: string
  streak?: number
}

export interface ActivityLog {
  id: string
  userId: string
  activityType: ActivityType
  sessionId?: string | null
  score?: number | null
  details: ActivityDetails
  createdAt: number
}

/**
 * Log a single learning activity for leaderboard tracking.
 * Fire-and-forget; errors are caught and logged to console only.
 */
export async function logActivity(
  userId: string,
  activityType: ActivityType,
  options: {
    sessionId?: string
    score?: number
    details?: ActivityDetails
  } = {}
): Promise<void> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO activity_logs (user_id, activity_type, session_id, score, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        activityType,
        options.sessionId ?? null,
        options.score ?? null,
        JSON.stringify(options.details ?? {}),
      ]
    )
  } catch (error) {
    // Non-fatal — leaderboard tracking should never break core flows
    console.error("[activity] Failed to log activity:", error)
  } finally {
    client.release()
  }
}

/**
 * Returns all activity logs for a user during the given ISO week
 * (week_start is Monday 00:00 UTC).
 */
export async function getWeeklyActivities(
  userId: string,
  weekStart: Date
): Promise<ActivityLog[]> {
  const client = await getClient()
  try {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const result = await client.query(
      `SELECT id, user_id, activity_type, session_id, score, details, created_at
       FROM activity_logs
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at < $3
       ORDER BY created_at ASC`,
      [userId, weekStart, weekEnd]
    )

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type as ActivityType,
      sessionId: row.session_id,
      score: row.score,
      details: row.details ?? {},
      createdAt: new Date(row.created_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

/**
 * Compute the reading streak (consecutive calendar days with any activity)
 * up to and including the last day of the given week.
 */
export async function getReadingStreak(
  userId: string,
  asOf: Date
): Promise<number> {
  const client = await getClient()
  try {
    // Get all distinct activity dates (UTC day), most recent first
    const result = await client.query(
      `SELECT DISTINCT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS activity_date
       FROM activity_logs
       WHERE user_id = $1
         AND created_at <= $2
       ORDER BY activity_date DESC`,
      [userId, asOf]
    )

    if (result.rows.length === 0) return 0

    const dates: Date[] = result.rows.map(r => new Date(r.activity_date))
    let streak = 1
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i - 1].getTime() - dates[i].getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        streak++
      } else {
        break
      }
    }
    return streak
  } finally {
    client.release()
  }
}

/**
 * Returns ISO week start (Monday) for a given date.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day  // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

import { getClient } from "./db"
import { getWeekStart, getReadingStreak } from "./activity"

// ─── Public types ─────────────────────────────────────────────────────────────

export type LeaderboardScope = "class" | "school" | "global"
export type SortColumn =
  | "weekly_score"
  | "reading_streak_days"
  | "avg_test_score"
  | "avg_quiz_score"
  | "avg_spelling_score"
  | "total_vocabulary_words"
  | "improvement_score"
  | "total_flashcard_reviews"

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userImage?: string | null
  classId?: string | null
  className?: string | null
  schoolId?: string | null
  schoolName?: string | null
  weeklyScore: number
  streakDays: number
  avgTestScore: number
  avgQuizScore: number
  avgSpellingScore: number
  flashcardReviews: number
  totalVocabWords: number
  totalSessions: number
  testsCompleted: number
  quizzesCompleted: number
  improvementScore: number
  priorWeekRank?: number | null
}

export interface LeaderboardResponse {
  rankings: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
  weekStartDate: string
  weekEndDate: string
  scope: LeaderboardScope
}

export interface PersonalStats {
  currentWeek: WeeklyStatsRow | null
  priorWeek: WeeklyStatsRow | null
  allTime: {
    totalSessions: number
    longestStreak: number
    totalVocabWords: number
    avgAllTimeTestScore: number
    totalFlashcardReviews: number
  }
  rankInClass: number | null
  rankInSchool: number | null
  rankGlobal: number | null
}

interface WeeklyStatsRow {
  userId: string
  weekStartDate: string
  totalSessions: number
  readingStreakDays: number
  avgTestScore: number
  totalFlashcardReviews: number
  avgQuizScore: number
  avgSpellingScore: number
  totalVocabularyWords: number
  testsCompleted: number
  quizzesCompleted: number
  spellingGamesCompleted: number
  weeklyScore: number
  improvementScore: number
}

// ─── Composite score formula ──────────────────────────────────────────────────
// Weights are deliberately generous to reward vocab growth and sustained reading
// over one-off high scores.
//
// Weekly Score =
//   streakDays × 10 +
//   avgTestScore × 1.0 +
//   avgQuizScore × 1.0 +
//   avgSpellingScore × 0.5 +
//   flashcardReviews × 5 +
//   totalVocabWords × 1 +
//   max(0, improvementBonus)    ← up to +20% of base score
//
function calcWeeklyScore(
  streakDays: number,
  avgTestScore: number,
  avgQuizScore: number,
  avgSpellingScore: number,
  flashcardReviews: number,
  totalVocabWords: number,
  priorWeekScore: number
): number {
  const base =
    streakDays * 10 +
    avgTestScore * 1.0 +
    avgQuizScore * 1.0 +
    avgSpellingScore * 0.5 +
    flashcardReviews * 5 +
    totalVocabWords * 1

  const improvementBonus = priorWeekScore > 0
    ? Math.max(0, (base - priorWeekScore) * 0.2)
    : 0

  return Math.round(base + improvementBonus)
}

// ─── Upsert weekly stats for one user ─────────────────────────────────────────
export async function refreshWeeklyStatsForUser(
  userId: string,
  weekStart: Date = getWeekStart()
): Promise<WeeklyStatsRow> {
  const client = await getClient()

  try {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Count distinct active days this week
    const streakDays = await getReadingStreak(userId, weekEnd)

    // Aggregate scores from activity_logs
    const aggResult = await client.query(
      `SELECT
         COUNT(DISTINCT CASE WHEN activity_type = 'session_create' THEN session_id END) AS total_sessions,
         COUNT(CASE WHEN activity_type = 'test_complete' THEN 1 END)    AS tests_completed,
         AVG(CASE WHEN activity_type = 'test_complete' THEN score END)  AS avg_test_score,
         COUNT(CASE WHEN activity_type = 'quiz_complete' THEN 1 END)    AS quizzes_completed,
         AVG(CASE WHEN activity_type = 'quiz_complete' THEN score END)  AS avg_quiz_score,
         COUNT(CASE WHEN activity_type = 'spelling_complete' THEN 1 END) AS spelling_games,
         AVG(CASE WHEN activity_type = 'spelling_complete' THEN score END) AS avg_spelling_score,
         COALESCE(SUM(CASE WHEN activity_type = 'flashcard_review'
                           THEN (details->>'cardsReviewed')::int
                           ELSE 0 END), 0) AS total_flashcard_reviews
       FROM activity_logs
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [userId, weekStart, weekEnd]
    )

    const agg = aggResult.rows[0]

    // Total unique vocabulary words from all sessions created this week
    const vocabResult = await client.query(
      `SELECT COALESCE(SUM(jsonb_array_length(glossary)), 0) AS total_vocab
       FROM reading_sessions
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [userId, weekStart, weekEnd]
    )

    const totalVocabWords = parseInt(vocabResult.rows[0]?.total_vocab ?? "0") || 0
    const totalSessions   = parseInt(agg.total_sessions ?? "0") || 0
    const testsCompleted  = parseInt(agg.tests_completed ?? "0") || 0
    const avgTestScore    = parseFloat(agg.avg_test_score ?? "0") || 0
    const quizzesCompleted = parseInt(agg.quizzes_completed ?? "0") || 0
    const avgQuizScore    = parseFloat(agg.avg_quiz_score ?? "0") || 0
    const spellingGamesCompleted = parseInt(agg.spelling_games ?? "0") || 0
    const avgSpellingScore = parseFloat(agg.avg_spelling_score ?? "0") || 0
    const totalFlashcardReviews = parseInt(agg.total_flashcard_reviews ?? "0") || 0

    // Get prior week's score for improvement bonus
    const priorWeekStart = new Date(weekStart)
    priorWeekStart.setDate(priorWeekStart.getDate() - 7)

    const priorResult = await client.query(
      `SELECT weekly_score FROM weekly_stats
       WHERE user_id = $1 AND week_start_date = $2`,
      [userId, priorWeekStart.toISOString().slice(0, 10)]
    )
    const priorWeekScore = parseFloat(priorResult.rows[0]?.weekly_score ?? "0") || 0

    const weeklyScore = calcWeeklyScore(
      streakDays,
      avgTestScore,
      avgQuizScore,
      avgSpellingScore,
      totalFlashcardReviews,
      totalVocabWords,
      priorWeekScore
    )

    const improvementScore = Math.round(weeklyScore - priorWeekScore)

    // Upsert
    await client.query(
      `INSERT INTO weekly_stats (
         user_id, week_start_date,
         total_sessions, reading_streak_days,
         avg_test_score, total_flashcard_reviews,
         avg_quiz_score, avg_spelling_score,
         total_vocabulary_words,
         tests_completed, quizzes_completed, spelling_games_completed,
         weekly_score, improvement_score
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (user_id, week_start_date)
       DO UPDATE SET
         total_sessions            = EXCLUDED.total_sessions,
         reading_streak_days       = EXCLUDED.reading_streak_days,
         avg_test_score            = EXCLUDED.avg_test_score,
         total_flashcard_reviews   = EXCLUDED.total_flashcard_reviews,
         avg_quiz_score            = EXCLUDED.avg_quiz_score,
         avg_spelling_score        = EXCLUDED.avg_spelling_score,
         total_vocabulary_words    = EXCLUDED.total_vocabulary_words,
         tests_completed           = EXCLUDED.tests_completed,
         quizzes_completed         = EXCLUDED.quizzes_completed,
         spelling_games_completed  = EXCLUDED.spelling_games_completed,
         weekly_score              = EXCLUDED.weekly_score,
         improvement_score         = EXCLUDED.improvement_score,
         updated_at                = NOW()`,
      [
        userId,
        weekStart.toISOString().slice(0, 10),
        totalSessions,
        streakDays,
        avgTestScore,
        totalFlashcardReviews,
        avgQuizScore,
        avgSpellingScore,
        totalVocabWords,
        testsCompleted,
        quizzesCompleted,
        spellingGamesCompleted,
        weeklyScore,
        improvementScore,
      ]
    )

    return {
      userId,
      weekStartDate: weekStart.toISOString().slice(0, 10),
      totalSessions,
      readingStreakDays: streakDays,
      avgTestScore,
      totalFlashcardReviews,
      avgQuizScore,
      avgSpellingScore,
      totalVocabularyWords: totalVocabWords,
      testsCompleted,
      quizzesCompleted,
      spellingGamesCompleted,
      weeklyScore,
      improvementScore,
    }
  } finally {
    client.release()
  }
}

// ─── Get leaderboard ──────────────────────────────────────────────────────────
export async function getLeaderboard(
  requestingUserId: string,
  options: {
    scope: LeaderboardScope
    classId?: string
    schoolId?: string
    weekStart?: Date
    sortBy?: SortColumn
    limit?: number
  }
): Promise<LeaderboardResponse> {
  const client = await getClient()

  const weekStart = options.weekStart ?? getWeekStart()
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const sortBy  = options.sortBy ?? "weekly_score"
  const limit   = Math.min(options.limit ?? 50, 200)

  try {
    // Scope-specific JOIN/WHERE clauses
    let scopeJoin   = ""
    let scopeWhere  = ""
    const params: unknown[] = [weekStart.toISOString().slice(0, 10), limit]

    if (options.scope === "class" && options.classId) {
      scopeJoin  = `JOIN class_members cm ON cm.student_id = ws.user_id`
      scopeWhere = `AND cm.class_id = $3`
      params.push(options.classId)
    } else if (options.scope === "school" && options.schoolId) {
      scopeJoin  = `JOIN users su ON su.id = ws.user_id`
      scopeWhere = `AND su.school_id = $3`
      params.push(options.schoolId)
    }

    const sql = `
      SELECT
        ws.*,
        u.name            AS user_name,
        u.image           AS user_image,
        cm2.class_id      AS class_id,
        c.name            AS class_name,
        u.school_id       AS school_id,
        s.name            AS school_name,
        RANK() OVER (ORDER BY ws.${sortBy} DESC NULLS LAST) AS rank
      FROM weekly_stats ws
      JOIN users u ON u.id = ws.user_id
      LEFT JOIN class_members cm2 ON cm2.student_id = ws.user_id
      LEFT JOIN classes c ON c.id = cm2.class_id
      LEFT JOIN schools s ON s.id = u.school_id
      ${scopeJoin}
      WHERE ws.week_start_date = $1
        ${scopeWhere}
      ORDER BY ws.${sortBy} DESC NULLS LAST
      LIMIT $2`

    const result = await client.query(sql, params)

    // Prior-week ranks for delta display
    const priorWeekStart = new Date(weekStart)
    priorWeekStart.setDate(priorWeekStart.getDate() - 7)

    const priorSql = `
      SELECT ws.user_id,
             RANK() OVER (ORDER BY ws.${sortBy} DESC NULLS LAST) AS prior_rank
      FROM weekly_stats ws
      ${scopeJoin}
      WHERE ws.week_start_date = $1
        ${scopeWhere}`

    const priorParams: unknown[] = [priorWeekStart.toISOString().slice(0, 10)]
    if (options.scope === "class" && options.classId) priorParams.push(options.classId)
    else if (options.scope === "school" && options.schoolId) priorParams.push(options.schoolId)

    const priorResult = await client.query(priorSql, priorParams)
    const priorRankMap = new Map<string, number>(
      priorResult.rows.map(r => [r.user_id, parseInt(r.prior_rank)])
    )

    const mapRow = (row: Record<string, unknown>, rank: number): LeaderboardEntry => ({
      rank,
      userId:             row.user_id as string,
      userName:           (row.user_name as string) ?? "Unknown",
      userImage:          row.user_image as string | null,
      classId:            row.class_id as string | null,
      className:          row.class_name as string | null,
      schoolId:           row.school_id as string | null,
      schoolName:         row.school_name as string | null,
      weeklyScore:        Math.round(parseFloat(row.weekly_score as string) || 0),
      streakDays:         parseInt(row.reading_streak_days as string) || 0,
      avgTestScore:       Math.round(parseFloat(row.avg_test_score as string) || 0),
      avgQuizScore:       Math.round(parseFloat(row.avg_quiz_score as string) || 0),
      avgSpellingScore:   Math.round(parseFloat(row.avg_spelling_score as string) || 0),
      flashcardReviews:   parseInt(row.total_flashcard_reviews as string) || 0,
      totalVocabWords:    parseInt(row.total_vocabulary_words as string) || 0,
      totalSessions:      parseInt(row.total_sessions as string) || 0,
      testsCompleted:     parseInt(row.tests_completed as string) || 0,
      quizzesCompleted:   parseInt(row.quizzes_completed as string) || 0,
      improvementScore:   Math.round(parseFloat(row.improvement_score as string) || 0),
      priorWeekRank:      priorRankMap.get(row.user_id as string) ?? null,
    })

    const rankings: LeaderboardEntry[] = result.rows.map((row, i) =>
      mapRow(row, i + 1)
    )

    // Find current user entry (may not be in top N)
    let currentUserRank: LeaderboardEntry | null =
      rankings.find(r => r.userId === requestingUserId) ?? null

    if (!currentUserRank) {
      // Fetch their row individually
      const userSql = `
        SELECT
          ws.*,
          u.name          AS user_name,
          u.image         AS user_image,
          cm2.class_id    AS class_id,
          c.name          AS class_name,
          u.school_id     AS school_id,
          s.name          AS school_name,
          (SELECT COUNT(*) + 1 FROM weekly_stats ws2
           ${scopeJoin.replace("ws.", "ws2.")}
           WHERE ws2.week_start_date = $1
             AND ws2.${sortBy} > ws.${sortBy}
             ${scopeWhere.replace("$3", "$3")}
          ) AS rank
        FROM weekly_stats ws
        JOIN users u ON u.id = ws.user_id
        LEFT JOIN class_members cm2 ON cm2.student_id = ws.user_id
        LEFT JOIN classes c ON c.id = cm2.class_id
        LEFT JOIN schools s ON s.id = u.school_id
        ${scopeJoin}
        WHERE ws.week_start_date = $1
          AND ws.user_id = $2
          ${scopeWhere}`

      const userParams: unknown[] = [weekStart.toISOString().slice(0, 10), requestingUserId]
      if (options.scope === "class" && options.classId) userParams.push(options.classId)
      else if (options.scope === "school" && options.schoolId) userParams.push(options.schoolId)

      const userResult = await client.query(userSql, userParams)
      if (userResult.rows.length > 0) {
        currentUserRank = mapRow(
          userResult.rows[0],
          parseInt(userResult.rows[0].rank as string)
        )
      }
    }

    return {
      rankings,
      currentUserRank,
      weekStartDate: weekStart.toISOString().slice(0, 10),
      weekEndDate:   new Date(weekEnd.getTime() - 1).toISOString().slice(0, 10),
      scope: options.scope,
    }
  } finally {
    client.release()
  }
}

// ─── Personal stats ───────────────────────────────────────────────────────────
export async function getPersonalStats(
  userId: string,
  weekStart: Date = getWeekStart()
): Promise<PersonalStats> {
  const client = await getClient()

  try {
    const priorWeekStart = new Date(weekStart)
    priorWeekStart.setDate(priorWeekStart.getDate() - 7)

    const [currResult, priorResult, allTimeResult] = await Promise.all([
      client.query(
        `SELECT * FROM weekly_stats WHERE user_id = $1 AND week_start_date = $2`,
        [userId, weekStart.toISOString().slice(0, 10)]
      ),
      client.query(
        `SELECT * FROM weekly_stats WHERE user_id = $1 AND week_start_date = $2`,
        [userId, priorWeekStart.toISOString().slice(0, 10)]
      ),
      client.query(
        `SELECT
           COUNT(DISTINCT rs.id)::int                                  AS total_sessions,
           COALESCE(AVG(NULLIF(rs.test_score, 0)), 0)                 AS avg_test_score,
           COALESCE(SUM(jsonb_array_length(rs.glossary)), 0)           AS total_vocab,
           COALESCE(
             SUM(CASE WHEN al.activity_type = 'flashcard_review'
                      THEN (al.details->>'cardsReviewed')::int ELSE 0 END), 0
           ) AS total_flashcard_reviews
         FROM reading_sessions rs
         JOIN users u ON u.id = rs.user_id
         LEFT JOIN activity_logs al ON al.user_id = rs.user_id
         WHERE rs.user_id = $1`,
        [userId]
      ),
    ])

    const mapWeekRow = (row: Record<string, unknown>): WeeklyStatsRow => ({
      userId:                  row.user_id as string,
      weekStartDate:           row.week_start_date as string,
      totalSessions:           parseInt(row.total_sessions as string) || 0,
      readingStreakDays:        parseInt(row.reading_streak_days as string) || 0,
      avgTestScore:            parseFloat(row.avg_test_score as string) || 0,
      totalFlashcardReviews:   parseInt(row.total_flashcard_reviews as string) || 0,
      avgQuizScore:            parseFloat(row.avg_quiz_score as string) || 0,
      avgSpellingScore:        parseFloat(row.avg_spelling_score as string) || 0,
      totalVocabularyWords:    parseInt(row.total_vocabulary_words as string) || 0,
      testsCompleted:          parseInt(row.tests_completed as string) || 0,
      quizzesCompleted:        parseInt(row.quizzes_completed as string) || 0,
      spellingGamesCompleted:  parseInt(row.spelling_games_completed as string) || 0,
      weeklyScore:             parseFloat(row.weekly_score as string) || 0,
      improvementScore:        parseFloat(row.improvement_score as string) || 0,
    })

    // Longest streak: check the activity_logs for the longest run
    const streakResult = await client.query(
      `SELECT MAX(streak_len) AS longest_streak FROM (
         SELECT
           ROW_NUMBER() OVER (ORDER BY activity_date) -
           ROW_NUMBER() OVER (PARTITION BY grp ORDER BY activity_date) AS streak_len
         FROM (
           SELECT
             activity_date,
             activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date))::integer * interval '1 day' AS grp
           FROM (
             SELECT DISTINCT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS activity_date
             FROM activity_logs WHERE user_id = $1
           ) t
         ) grouped
       ) streaks`,
      [userId]
    )
    const longestStreak = parseInt(streakResult.rows[0]?.longest_streak ?? "0") || 0

    // Ranks
    const rankClassResult = await client.query(
      `SELECT COUNT(*) + 1 AS rank
       FROM weekly_stats ws2
       JOIN class_members cm2 ON cm2.student_id = ws2.user_id
       WHERE cm2.class_id = (SELECT class_id FROM class_members WHERE student_id = $1)
         AND ws2.week_start_date = $2
         AND ws2.weekly_score > COALESCE(
           (SELECT weekly_score FROM weekly_stats WHERE user_id = $1 AND week_start_date = $2), 0
         )`,
      [userId, weekStart.toISOString().slice(0, 10)]
    )
    const rankSchoolResult = await client.query(
      `SELECT COUNT(*) + 1 AS rank
       FROM weekly_stats ws2
       JOIN users u2 ON u2.id = ws2.user_id
       WHERE u2.school_id = (SELECT school_id FROM users WHERE id = $1)
         AND ws2.week_start_date = $2
         AND ws2.weekly_score > COALESCE(
           (SELECT weekly_score FROM weekly_stats WHERE user_id = $1 AND week_start_date = $2), 0
         )`,
      [userId, weekStart.toISOString().slice(0, 10)]
    )
    const rankGlobalResult = await client.query(
      `SELECT COUNT(*) + 1 AS rank
       FROM weekly_stats
       WHERE week_start_date = $1
         AND weekly_score > COALESCE(
           (SELECT weekly_score FROM weekly_stats WHERE user_id = $2 AND week_start_date = $1), 0
         )`,
      [weekStart.toISOString().slice(0, 10), userId]
    )

    const allTime = allTimeResult.rows[0]

    return {
      currentWeek: currResult.rows.length > 0 ? mapWeekRow(currResult.rows[0]) : null,
      priorWeek:   priorResult.rows.length > 0 ? mapWeekRow(priorResult.rows[0]) : null,
      allTime: {
        totalSessions:         parseInt(allTime.total_sessions) || 0,
        longestStreak,
        totalVocabWords:       parseInt(allTime.total_vocab) || 0,
        avgAllTimeTestScore:   Math.round(parseFloat(allTime.avg_test_score) || 0),
        totalFlashcardReviews: parseInt(allTime.total_flashcard_reviews) || 0,
      },
      rankInClass:  parseInt(rankClassResult.rows[0]?.rank ?? "0") || null,
      rankInSchool: parseInt(rankSchoolResult.rows[0]?.rank ?? "0") || null,
      rankGlobal:   parseInt(rankGlobalResult.rows[0]?.rank ?? "0") || null,
    }
  } finally {
    client.release()
  }
}

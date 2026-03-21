import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient, bufferToBase64 } from "@/lib/db"
import { Uint8ArrayWriter, TextReader, ZipWriter, configure as zipConfigure } from "@zip.js/zip.js"

// Disable Web Workers — they are unavailable in the Next.js Node.js runtime.
zipConfigure({ useWebWorkers: false })

/**
 * GET /api/admin/export
 *
 * Admin-only endpoint that exports a complete snapshot of all user-management
 * and reading-history tables as a single JSON document compressed inside a
 * .zip file suitable for backup and full database recovery.
 *
 * Export shape (version 2):
 * {
 *   version: 2,
 *   exportedAt: <ISO-8601 string>,
 *   schools, users, classes, classMemberships,   ← v1 tables (unchanged)
 *   readingSessions, readingImages,              ← reading history + images
 *   activityLogs, weeklyStats,                  ← leaderboard data
 *   userAchievements, chatQuestions,             ← achievements + AI tutor
 *   userSettings,                               ← per-user settings
 * }
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await getClient()
  try {
    // ── Schools ────────────────────────────────────────────────────────────
    const schoolsResult = await client.query(
      `SELECT id, name, domain, created_at FROM schools ORDER BY created_at ASC`
    )
    const schools = schoolsResult.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      domain: r.domain as string,
      createdAt: new Date(r.created_at as string).getTime(),
    }))

    // ── Users ──────────────────────────────────────────────────────────────
    // We export id, name, email, image, school_id, created_at, and the role
    // from user_roles (defaulting to 'student' when absent).
    const usersResult = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.image,
         u.school_id,
         u."createdAt",
         COALESCE(ur.role, 'student') AS role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       ORDER BY u."createdAt" ASC`
    )
    const users = usersResult.rows.map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      role: r.role as string,
      schoolId: (r.school_id as string | null) ?? null,
      createdAt: r.createdAt ? new Date(r.createdAt as string).getTime() : null,
    }))

    // ── Classes ────────────────────────────────────────────────────────────
    const classesResult = await client.query(
      `SELECT id, name, description, teacher_id, school_id, created_at
       FROM classes
       ORDER BY created_at ASC`
    )
    const classes = classesResult.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string | null) ?? null,
      teacherId: (r.teacher_id as string | null) ?? null,
      schoolId: (r.school_id as string | null) ?? null,
      createdAt: new Date(r.created_at as string).getTime(),
    }))

    // ── Class Memberships ──────────────────────────────────────────────────
    const membersResult = await client.query(
      `SELECT class_id, student_id, joined_at
       FROM class_members
       ORDER BY joined_at ASC`
    )
    const classMemberships = membersResult.rows.map((r) => ({
      classId: r.class_id as string,
      studentId: r.student_id as string,
      joinedAt: new Date(r.joined_at as string).getTime(),
    }))

    // ── Reading Sessions ─────────────────────────────────────────────────────
    const sessionsResult = await client.query(
      `SELECT
         id, user_id, doc_title, student_age, extracted_text, summary,
         adapted_text, simplified_text, highlighted_words, analyzed_sentences,
         mind_map, reading_test, glossary, glossary_ratings, test_score,
         test_completed, test_earned_points, test_total_points, test_show_chinese,
         test_mode, vocabulary_quiz_score, spelling_game_best_score, chat_history,
         original_difficulty, adapted_difficulty, simplified_difficulty,
         include_glossary, include_sentence_analysis, created_at, updated_at
       FROM reading_sessions
       ORDER BY created_at ASC`
    )
    const readingSessions = sessionsResult.rows.map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      docTitle: (r.doc_title as string) ?? "",
      studentAge: r.student_age as number,
      extractedText: r.extracted_text as string,
      summary: (r.summary as string) ?? "",
      adaptedText: (r.adapted_text as string) ?? "",
      simplifiedText: (r.simplified_text as string) ?? "",
      highlightedWords: r.highlighted_words ?? [],
      analyzedSentences: r.analyzed_sentences ?? {},
      mindMap: (r.mind_map as string) ?? "",
      readingTest: r.reading_test ?? [],
      glossary: r.glossary ?? [],
      glossaryRatings: r.glossary_ratings ?? {},
      testScore: r.test_score as number,
      testCompleted: r.test_completed as boolean,
      testEarnedPoints: r.test_earned_points as number,
      testTotalPoints: r.test_total_points as number,
      testShowChinese: r.test_show_chinese as boolean,
      testMode: (r.test_mode as string) ?? "all-at-once",
      vocabularyQuizScore: r.vocabulary_quiz_score as number,
      spellingGameBestScore: r.spelling_game_best_score as number,
      chatHistory: r.chat_history ?? [],
      originalDifficulty: r.original_difficulty ?? null,
      adaptedDifficulty: r.adapted_difficulty ?? null,
      simplifiedDifficulty: r.simplified_difficulty ?? null,
      includeGlossary: r.include_glossary as boolean,
      includeSentenceAnalysis: r.include_sentence_analysis as boolean,
      createdAt: new Date(r.created_at as string).getTime(),
      updatedAt: new Date(r.updated_at as string).getTime(),
    }))

    // ── Reading Images ───────────────────────────────────────────────────────
    // image_data is stored as BYTEA; convert to base64 data-URI for portability.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let readingImages: any[] = []
    try {
      const imagesResult = await client.query(
        `SELECT session_id, image_order, image_data, content_type
         FROM reading_images
         ORDER BY session_id, image_order ASC`
      )
      readingImages = imagesResult.rows.map((r) => ({
        sessionId: r.session_id as string,
        order: r.image_order as number,
        data: bufferToBase64(r.image_data as Buffer, (r.content_type as string) ?? "image/png"),
        contentType: (r.content_type as string) ?? "image/png",
      }))
    } catch (e) {
      console.warn("Export: reading_images query failed (table may not exist):", e)
    }

    // ── Activity Logs ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activityLogs: any[] = []
    try {
      const activityResult = await client.query(
        `SELECT id, user_id, activity_type, session_id, score, details, created_at
         FROM activity_logs
         ORDER BY created_at ASC`
      )
      activityLogs = activityResult.rows.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        activityType: r.activity_type as string,
        sessionId: (r.session_id as string | null) ?? null,
        score: (r.score as number | null) ?? null,
        details: r.details ?? {},
        createdAt: new Date(r.created_at as string).getTime(),
      }))
    } catch (e) {
      console.warn("Export: activity_logs query failed (table may not exist):", e)
    }

    // ── Weekly Stats ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let weeklyStats: any[] = []
    try {
      const weeklyResult = await client.query(
        `SELECT
           id, user_id, week_start_date, total_sessions, reading_streak_days,
           avg_test_score, total_flashcard_reviews, avg_quiz_score,
           avg_spelling_score, total_vocabulary_words, tests_completed,
           quizzes_completed, spelling_games_completed, weekly_score,
           improvement_score, created_at, updated_at
         FROM weekly_stats
         ORDER BY week_start_date ASC`
      )
      weeklyStats = weeklyResult.rows.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        weekStartDate: r.week_start_date as string,
        totalSessions: r.total_sessions as number,
        readingStreakDays: r.reading_streak_days as number,
        avgTestScore: parseFloat(r.avg_test_score as string),
        totalFlashcardReviews: r.total_flashcard_reviews as number,
        avgQuizScore: parseFloat(r.avg_quiz_score as string),
        avgSpellingScore: parseFloat(r.avg_spelling_score as string),
        totalVocabularyWords: r.total_vocabulary_words as number,
        testsCompleted: r.tests_completed as number,
        quizzesCompleted: r.quizzes_completed as number,
        spellingGamesCompleted: r.spelling_games_completed as number,
        weeklyScore: parseFloat(r.weekly_score as string),
        improvementScore: parseFloat(r.improvement_score as string),
        createdAt: new Date(r.created_at as string).getTime(),
        updatedAt: new Date(r.updated_at as string).getTime(),
      }))
    } catch (e) {
      console.warn("Export: weekly_stats query failed (table may not exist):", e)
    }

    // ── User Achievements ────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userAchievements: any[] = []
    try {
      const achievementsResult = await client.query(
        `SELECT id, user_id, achievement_type, milestone, unlocked_at, created_at
         FROM user_achievements
         ORDER BY created_at ASC`
      )
      userAchievements = achievementsResult.rows.map((r) => ({
        id: r.id as number,
        userId: r.user_id as string,
        achievementType: r.achievement_type as string,
        milestone: r.milestone as number,
        unlockedAt: new Date(r.unlocked_at as string).getTime(),
        createdAt: new Date(r.created_at as string).getTime(),
      }))
    } catch (e) {
      console.warn("Export: user_achievements query failed (table may not exist):", e)
    }

    // ── Chat Questions ───────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chatQuestions: any[] = []
    try {
      const chatQuestionsResult = await client.query(
        `SELECT id, question_hash, question_text, normalized_text, user_id,
                session_id, doc_title, response_text, created_at
         FROM chat_questions
         ORDER BY created_at ASC`
      )
      chatQuestions = chatQuestionsResult.rows.map((r) => ({
        id: r.id as string,
        questionHash: r.question_hash as string,
        questionText: r.question_text as string,
        normalizedText: r.normalized_text as string,
        userId: r.user_id as string,
        sessionId: (r.session_id as string | null) ?? null,
        docTitle: (r.doc_title as string | null) ?? null,
        responseText: (r.response_text as string | null) ?? null,
        createdAt: new Date(r.created_at as string).getTime(),
      }))
    } catch (e) {
      console.warn("Export: chat_questions query failed (table may not exist):", e)
    }

    // ── User Settings ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userSettings: any[] = []
    try {
      const settingsResult = await client.query(
        `SELECT user_id, settings, created_at, updated_at
         FROM user_settings
         ORDER BY created_at ASC`
      )
      userSettings = settingsResult.rows.map((r) => ({
        userId: r.user_id as string,
        settings: r.settings ?? {},
        createdAt: new Date(r.created_at as string).getTime(),
        updatedAt: new Date(r.updated_at as string).getTime(),
      }))
    } catch (e) {
      console.warn("Export: user_settings query failed (table may not exist):", e)
    }

    // ── Assemble payload ─────────────────────────────────────────────────────
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      schools,
      users,
      classes,
      classMemberships,
      readingSessions,
      readingImages,
      activityLogs,
      weeklyStats,
      userAchievements,
      chatQuestions,
      userSettings,
    }

    // ── Compress into a ZIP ──────────────────────────────────────────────────
    // Use Uint8ArrayWriter (not BlobWriter) — Blob is a browser API and
    // unavailable in the Next.js Node.js server runtime.
    const zipWriter = new ZipWriter(new Uint8ArrayWriter())
    await zipWriter.add("backup.json", new TextReader(JSON.stringify(payload)))
    const zipBuffer = await zipWriter.close()

    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const filename = `mrng-proreader-full-backup-${ts}.zip`

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export failed:", error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Export failed", detail: message }, { status: 500 })
  } finally {
    client.release()
  }
}

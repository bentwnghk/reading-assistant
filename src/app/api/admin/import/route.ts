import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient, base64ToBuffer } from "@/lib/db"
import { z } from "zod"
import { Uint8ArrayReader, TextWriter, ZipReader, configure as zipConfigure } from "@zip.js/zip.js"
import type { FileEntry } from "@zip.js/zip.js"

// Disable Web Workers — they are unavailable in the Next.js Node.js runtime.
// Disable CompressionStream — Next.js polyfills it incorrectly in some Node environments.
zipConfigure({ useWebWorkers: false, useCompressionStream: false })

// ── Zod schemas ──────────────────────────────────────────────────────────────

const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  createdAt: z.number(),
})

const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  role: z.enum(["super-admin", "admin", "teacher", "student"]),
  schoolId: z.string().nullable().optional(),
  createdAt: z.number().nullable().optional(),
})

const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  createdAt: z.number(),
})

const MembershipSchema = z.object({
  classId: z.string(),
  studentId: z.string(),
  joinedAt: z.number(),
})

const ReadingSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  docTitle: z.string().default(""),
  studentAge: z.number().default(13),
  extractedText: z.string(),
  summary: z.string().default(""),
  adaptedText: z.string().default(""),
  simplifiedText: z.string().default(""),
  highlightedWords: z.array(z.unknown()).default([]),
  analyzedSentences: z.record(z.unknown()).default({}),
  mindMap: z.string().default(""),
  readingTest: z.array(z.unknown()).default([]),
  glossary: z.array(z.unknown()).default([]),
  glossaryRatings: z.record(z.unknown()).default({}),
  testScore: z.number().default(0),
  testCompleted: z.boolean().default(false),
  testEarnedPoints: z.number().default(0),
  testTotalPoints: z.number().default(0),
  testShowChinese: z.boolean().default(false),
  testMode: z.string().default("all-at-once"),
  vocabularyQuizScore: z.number().default(0),
  spellingGameBestScore: z.number().default(0),
  chatHistory: z.array(z.unknown()).default([]),
  originalDifficulty: z.unknown().nullable().default(null),
  adaptedDifficulty: z.unknown().nullable().default(null),
  simplifiedDifficulty: z.unknown().nullable().default(null),
  includeGlossary: z.boolean().default(true),
  includeSentenceAnalysis: z.boolean().default(true),
  pronunciationAttempts: z.array(z.unknown()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const ReadingImageSchema = z.object({
  sessionId: z.string(),
  order: z.number(),
  data: z.string(),            // base64 data-URI
  contentType: z.string().default("image/png"),
})

const ActivityLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityType: z.string(),
  sessionId: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  details: z.record(z.unknown()).default({}),
  createdAt: z.number(),
})

const WeeklyStatSchema = z.object({
  id: z.string(),
  userId: z.string(),
  weekStartDate: z.string(),
  totalSessions: z.number().default(0),
  readingStreakDays: z.number().default(0),
  avgTestScore: z.number().default(0),
  totalFlashcardReviews: z.number().default(0),
  avgQuizScore: z.number().default(0),
  avgSpellingScore: z.number().default(0),
  totalVocabularyWords: z.number().default(0),
  testsCompleted: z.number().default(0),
  quizzesCompleted: z.number().default(0),
  spellingGamesCompleted: z.number().default(0),
  weeklyScore: z.number().default(0),
  improvementScore: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const UserAchievementSchema = z.object({
  id: z.number(),
  userId: z.string(),
  achievementType: z.string(),
  milestone: z.number(),
  unlockedAt: z.number(),
  createdAt: z.number(),
})

const ChatQuestionSchema = z.object({
  id: z.string(),
  questionHash: z.string(),
  questionText: z.string(),
  normalizedText: z.string(),
  userId: z.string(),
  sessionId: z.string().nullable().optional(),
  docTitle: z.string().nullable().optional(),
  responseText: z.string().nullable().optional(),
  createdAt: z.number(),
})

const UserSettingSchema = z.object({
  userId: z.string(),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.number(),
  updatedAt: z.number(),
})

// Accept both v1 (legacy JSON) and v2 (full ZIP backup) payloads.
const ImportPayloadSchema = z.union([
  // v1 — user-management only (backward compat with legacy .json export)
  z.object({
    version: z.literal(1),
    exportedAt: z.string(),
    schools: z.array(SchoolSchema),
    users: z.array(UserSchema),
    classes: z.array(ClassSchema),
    classMemberships: z.array(MembershipSchema),
  }),
  // v2 — full backup including reading history
  z.object({
    version: z.literal(2),
    exportedAt: z.string(),
    schools: z.array(SchoolSchema),
    users: z.array(UserSchema),
    classes: z.array(ClassSchema),
    classMemberships: z.array(MembershipSchema),
    readingSessions: z.array(ReadingSessionSchema).default([]),
    readingImages: z.array(ReadingImageSchema).default([]),
    activityLogs: z.array(ActivityLogSchema).default([]),
    weeklyStats: z.array(WeeklyStatSchema).default([]),
    userAchievements: z.array(UserAchievementSchema).default([]),
    chatQuestions: z.array(ChatQuestionSchema).default([]),
    userSettings: z.array(UserSettingSchema).default([]),
  }),
])

/**
 * POST /api/admin/import
 *
 * Admin-only endpoint. Accepts either:
 *   - A multipart/form-data request with a `file` field containing a .zip
 *     backup (produced by GET /api/admin/export v2), or
 *   - A raw JSON body (legacy v1 format, for backward compatibility).
 *
 * Restores all tables using upsert semantics so the operation is safely
 * re-runnable (idempotent).
 *
 * Restoration order (dependency-safe):
 *   schools → users + roles → classes → class_members
 *   → reading_sessions → reading_images
 *   → activity_logs → weekly_stats → user_achievements
 *   → chat_questions → user_settings
 */
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── Parse incoming payload (ZIP or JSON) ────────────────────────────────
  let body: unknown
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    // ZIP file upload via form-data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    const file = formData.get("file")
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    try {
      // Convert Blob → Uint8Array — Uint8ArrayReader is the Node.js-safe
      // alternative to BlobReader, which depends on browser Blob internals.
      const arrayBuffer = await file.arrayBuffer()
      const zipReader = new ZipReader(new Uint8ArrayReader(new Uint8Array(arrayBuffer)))
      const entries = await zipReader.getEntries()
      const jsonEntry = entries.find((e) => e.filename === "backup.json") as FileEntry | undefined
      if (!jsonEntry) {
        return NextResponse.json(
          { error: "backup.json not found inside ZIP" },
          { status: 422 }
        )
      }
      const jsonText = await jsonEntry.getData(new TextWriter())
      await zipReader.close()
      body = JSON.parse(jsonText)
    } catch {
      return NextResponse.json(
        { error: "Failed to read ZIP file" },
        { status: 400 }
      )
    }
  } else {
    // Legacy: raw JSON body (v1 .json backups)
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
  }

  const parsed = ImportPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import file format", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data

  const client = await getClient()
  try {
    await client.query("BEGIN")

    // ── 1. Schools ───────────────────────────────────────────────────────────
    let schoolsUpserted = 0
    for (const school of data.schools) {
      const ts = new Date(school.createdAt).toISOString()
      await client.query(
        `INSERT INTO schools (id, name, domain, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET name   = EXCLUDED.name,
               domain = EXCLUDED.domain`,
        [school.id, school.name, school.domain, ts]
      )
      schoolsUpserted++
    }

    // ── 2. Users ─────────────────────────────────────────────────────────────
    // Pre-populate user rows so users can sign in immediately on a fresh server.
    // @auth/pg-adapter matches by email on first OAuth sign-in and links the
    // account. "emailVerified" is intentionally left NULL.
    let usersUpserted = 0
    for (const user of data.users) {
      await client.query(
        `INSERT INTO users (id, name, email, image, "emailVerified")
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (id) DO UPDATE
           SET name  = EXCLUDED.name,
               email = EXCLUDED.email,
               image = EXCLUDED.image`,
        [user.id, user.name ?? null, user.email ?? null, user.image ?? null]
      )
      await client.query(
        `UPDATE users SET school_id = $1 WHERE id = $2`,
        [user.schoolId ?? null, user.id]
      )
      await client.query(
        `INSERT INTO user_roles (user_id, role)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
        [user.id, user.role]
      )
      usersUpserted++
    }

    const existingUserIds = new Set<string>(data.users.map((u) => u.id))

    // ── 3. Classes ───────────────────────────────────────────────────────────
    let classesUpserted = 0
    for (const cls of data.classes) {
      const ts = new Date(cls.createdAt).toISOString()
      await client.query(
        `INSERT INTO classes (id, name, description, teacher_id, school_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET name        = EXCLUDED.name,
               description = EXCLUDED.description,
               teacher_id  = EXCLUDED.teacher_id,
               school_id   = EXCLUDED.school_id`,
        [
          cls.id,
          cls.name,
          cls.description ?? null,
          cls.teacherId ?? null,
          cls.schoolId ?? null,
          ts,
        ]
      )
      classesUpserted++
    }

    // ── 4. Class Memberships ─────────────────────────────────────────────────
    // Skip memberships where either the class or the student doesn't exist.
    const classIds = new Set(data.classes.map((c) => c.id))
    let membershipsUpserted = 0
    let membershipsSkipped = 0
    for (const m of data.classMemberships) {
      if (!classIds.has(m.classId) || !existingUserIds.has(m.studentId)) {
        membershipsSkipped++
        continue
      }
      const ts = new Date(m.joinedAt).toISOString()
      await client.query(
        `INSERT INTO class_members (class_id, student_id, joined_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id) DO UPDATE
           SET class_id  = EXCLUDED.class_id,
               joined_at = EXCLUDED.joined_at`,
        [m.classId, m.studentId, ts]
      )
      membershipsUpserted++
    }

    // ── v2-only tables ────────────────────────────────────────────────────────
    let sessionsUpserted = 0
    let imagesRestored = 0
    let activityLogsInserted = 0
    let weeklyStatsUpserted = 0
    let achievementsUpserted = 0
    let chatQuestionsInserted = 0
    let userSettingsUpserted = 0

    if (data.version === 2) {
      // ── 5. Reading Sessions ──────────────────────────────────────────────
      for (const s of data.readingSessions) {
        if (!existingUserIds.has(s.userId)) continue
        const createdTs = new Date(s.createdAt).toISOString()
        const updatedTs = new Date(s.updatedAt).toISOString()
        await client.query(
          `INSERT INTO reading_sessions (
             id, user_id, doc_title, student_age, extracted_text, summary,
             adapted_text, simplified_text, highlighted_words, analyzed_sentences,
             mind_map, reading_test, glossary, glossary_ratings, test_score,
             test_completed, test_earned_points, test_total_points, test_show_chinese,
             test_mode, vocabulary_quiz_score, spelling_game_best_score, chat_history,
             original_difficulty, adapted_difficulty, simplified_difficulty,
             include_glossary, include_sentence_analysis, created_at, updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
             $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
           )
           ON CONFLICT (id) DO UPDATE SET
             doc_title                 = EXCLUDED.doc_title,
             student_age               = EXCLUDED.student_age,
             extracted_text            = EXCLUDED.extracted_text,
             summary                   = EXCLUDED.summary,
             adapted_text              = EXCLUDED.adapted_text,
             simplified_text           = EXCLUDED.simplified_text,
             highlighted_words         = EXCLUDED.highlighted_words,
             analyzed_sentences        = EXCLUDED.analyzed_sentences,
             mind_map                  = EXCLUDED.mind_map,
             reading_test              = EXCLUDED.reading_test,
             glossary                  = EXCLUDED.glossary,
             glossary_ratings          = EXCLUDED.glossary_ratings,
             test_score                = EXCLUDED.test_score,
             test_completed            = EXCLUDED.test_completed,
             test_earned_points        = EXCLUDED.test_earned_points,
             test_total_points         = EXCLUDED.test_total_points,
             test_show_chinese         = EXCLUDED.test_show_chinese,
             test_mode                 = EXCLUDED.test_mode,
             vocabulary_quiz_score     = EXCLUDED.vocabulary_quiz_score,
             spelling_game_best_score  = EXCLUDED.spelling_game_best_score,
             chat_history              = EXCLUDED.chat_history,
             original_difficulty       = EXCLUDED.original_difficulty,
             adapted_difficulty        = EXCLUDED.adapted_difficulty,
             simplified_difficulty     = EXCLUDED.simplified_difficulty,
             include_glossary          = EXCLUDED.include_glossary,
             include_sentence_analysis = EXCLUDED.include_sentence_analysis,
             updated_at                = EXCLUDED.updated_at`,
          [
            s.id, s.userId, s.docTitle, s.studentAge, s.extractedText,
            s.summary, s.adaptedText, s.simplifiedText,
            JSON.stringify(s.highlightedWords),
            JSON.stringify(s.analyzedSentences),
            s.mindMap,
            JSON.stringify(s.readingTest),
            JSON.stringify(s.glossary),
            JSON.stringify(s.glossaryRatings),
            s.testScore, s.testCompleted, s.testEarnedPoints, s.testTotalPoints,
            s.testShowChinese, s.testMode, s.vocabularyQuizScore,
            s.spellingGameBestScore,
            JSON.stringify(s.chatHistory),
            s.originalDifficulty ? JSON.stringify(s.originalDifficulty) : null,
            s.adaptedDifficulty  ? JSON.stringify(s.adaptedDifficulty)  : null,
            s.simplifiedDifficulty ? JSON.stringify(s.simplifiedDifficulty) : null,
            s.includeGlossary, s.includeSentenceAnalysis,
            JSON.stringify(s.pronunciationAttempts ?? []),
            createdTs, updatedTs,
          ]
        )
        sessionsUpserted++
      }

      // ── 6. Reading Images ────────────────────────────────────────────────
      // Group images by session; delete existing images for that session, then
      // insert the backup copies. Only process sessions that were upserted.
      const upsertedSessionIds = new Set(
        data.readingSessions
          .filter((s) => existingUserIds.has(s.userId))
          .map((s) => s.id)
      )
      const imagesBySession = new Map<string, typeof data.readingImages>()
      for (const img of data.readingImages) {
        if (!upsertedSessionIds.has(img.sessionId)) continue
        const arr = imagesBySession.get(img.sessionId) ?? []
        arr.push(img)
        imagesBySession.set(img.sessionId, arr)
      }

      for (const [sessionId, images] of imagesBySession) {
        const sessionRow = data.readingSessions.find((s) => s.id === sessionId)
        if (!sessionRow) continue
        await client.query(
          `DELETE FROM reading_images WHERE session_id = $1`,
          [sessionId]
        )
        for (const img of images) {
          const imageBuffer = base64ToBuffer(img.data)
          await client.query(
            `INSERT INTO reading_images
               (session_id, user_id, image_data, image_order, content_type, file_size)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              sessionId,
              sessionRow.userId,
              imageBuffer,
              img.order,
              img.contentType,
              imageBuffer.length,
            ]
          )
          imagesRestored++
        }
      }

      // ── 7. Activity Logs ─────────────────────────────────────────────────
      for (const log of data.activityLogs) {
        if (!existingUserIds.has(log.userId)) continue
        const ts = new Date(log.createdAt).toISOString()
        await client.query(
          `INSERT INTO activity_logs
             (id, user_id, activity_type, session_id, score, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            log.id, log.userId, log.activityType,
            log.sessionId ?? null, log.score ?? null,
            JSON.stringify(log.details), ts,
          ]
        )
        activityLogsInserted++
      }

      // ── 8. Weekly Stats ──────────────────────────────────────────────────
      for (const ws of data.weeklyStats) {
        if (!existingUserIds.has(ws.userId)) continue
        const createdTs = new Date(ws.createdAt).toISOString()
        const updatedTs = new Date(ws.updatedAt).toISOString()
        await client.query(
          `INSERT INTO weekly_stats (
             id, user_id, week_start_date, total_sessions, reading_streak_days,
             avg_test_score, total_flashcard_reviews, avg_quiz_score,
             avg_spelling_score, total_vocabulary_words, tests_completed,
             quizzes_completed, spelling_games_completed, weekly_score,
             improvement_score, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (user_id, week_start_date) DO UPDATE SET
             total_sessions           = EXCLUDED.total_sessions,
             reading_streak_days      = EXCLUDED.reading_streak_days,
             avg_test_score           = EXCLUDED.avg_test_score,
             total_flashcard_reviews  = EXCLUDED.total_flashcard_reviews,
             avg_quiz_score           = EXCLUDED.avg_quiz_score,
             avg_spelling_score       = EXCLUDED.avg_spelling_score,
             total_vocabulary_words   = EXCLUDED.total_vocabulary_words,
             tests_completed          = EXCLUDED.tests_completed,
             quizzes_completed        = EXCLUDED.quizzes_completed,
             spelling_games_completed = EXCLUDED.spelling_games_completed,
             weekly_score             = EXCLUDED.weekly_score,
             improvement_score        = EXCLUDED.improvement_score,
             updated_at               = EXCLUDED.updated_at`,
          [
            ws.id, ws.userId, ws.weekStartDate,
            ws.totalSessions, ws.readingStreakDays,
            ws.avgTestScore, ws.totalFlashcardReviews, ws.avgQuizScore,
            ws.avgSpellingScore, ws.totalVocabularyWords, ws.testsCompleted,
            ws.quizzesCompleted, ws.spellingGamesCompleted,
            ws.weeklyScore, ws.improvementScore,
            createdTs, updatedTs,
          ]
        )
        weeklyStatsUpserted++
      }

      // ── 9. User Achievements ─────────────────────────────────────────────
      for (const a of data.userAchievements) {
        if (!existingUserIds.has(a.userId)) continue
        const unlockedTs = new Date(a.unlockedAt).toISOString()
        const createdTs  = new Date(a.createdAt).toISOString()
        await client.query(
          `INSERT INTO user_achievements
             (user_id, achievement_type, milestone, unlocked_at, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, achievement_type, milestone) DO NOTHING`,
          [a.userId, a.achievementType, a.milestone, unlockedTs, createdTs]
        )
        achievementsUpserted++
      }

      // ── 10. Chat Questions ───────────────────────────────────────────────
      for (const q of data.chatQuestions) {
        if (!existingUserIds.has(q.userId)) continue
        const ts = new Date(q.createdAt).toISOString()
        await client.query(
          `INSERT INTO chat_questions
             (id, question_hash, question_text, normalized_text, user_id,
              session_id, doc_title, response_text, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            q.id, q.questionHash, q.questionText, q.normalizedText,
            q.userId, q.sessionId ?? null, q.docTitle ?? null,
            q.responseText ?? null, ts,
          ]
        )
        chatQuestionsInserted++
      }

      // ── 11. User Settings ────────────────────────────────────────────────
      for (const us of data.userSettings) {
        if (!existingUserIds.has(us.userId)) continue
        const createdTs = new Date(us.createdAt).toISOString()
        const updatedTs = new Date(us.updatedAt).toISOString()
        await client.query(
          `INSERT INTO user_settings (user_id, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE
             SET settings   = EXCLUDED.settings,
                 updated_at = EXCLUDED.updated_at`,
          [us.userId, JSON.stringify(us.settings), createdTs, updatedTs]
        )
        userSettingsUpserted++
      }
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      summary: {
        schoolsUpserted,
        usersUpserted,
        classesUpserted,
        membershipsUpserted,
        membershipsSkipped,
        sessionsUpserted,
        imagesRestored,
        activityLogsInserted,
        weeklyStatsUpserted,
        achievementsUpserted,
        chatQuestionsInserted,
        userSettingsUpserted,
      },
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Import failed:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }
}

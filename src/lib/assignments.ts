import { getClient } from "./db"
import type { PoolClient } from "pg"
import { logActivity } from "./activity"
import { getSchoolForUser } from "./users"
import type { ReadingStore } from "@/store/reading"
import { calculateProgress } from "@/utils/progress"
import { grammarGameBestScore } from "@/utils/sessionMetrics"

/**
 * Strip a reading session down to its assignable form: keep all AI-generated
 * content (questions, glossary, summary, mind map, grammar, etc.) and reset
 * every per-student attempt field. Forked from shared-sessions.stripUserData
 * with the grammar/spelling/completion state also reset (shared-sessions leaves
 * those untouched, which leaks source-student state into assignments).
 */
export function stripSessionForAssignment(sessionData: ReadingStore): Record<string, unknown> {
  const stripped: Record<string, unknown> = {
    ...sessionData,
    readingTest: Array.isArray(sessionData.readingTest)
      ? sessionData.readingTest.map((q) => {
          const clean: Record<string, unknown> = { ...q }
          delete clean.userAnswer
          delete clean.earnedPoints
          return clean
        })
      : sessionData.readingTest,
    // Reading test
    testScore: 0,
    testCompleted: false,
    testEarnedPoints: 0,
    // Vocabulary / spelling
    vocabularyQuizScore: 0,
    spellingGameBestScore: 0,
    spellingGameAccuracy: 0,
    spellingGamesCompleted: 0,
    vocabQuizzesCompleted: 0,
    testsCompleted: 0,
    // SRS / ratings
    flashcardReviewDates: [],
    glossaryRatings: {},
    // Pre-reading: content kept; user prediction zeroed
    studentPrediction: "",
    predictionRating: null,
    // Chat
    chatHistory: [],
    // Grammar quiz
    grammarQuizScore: 0,
    grammarQuizCompleted: false,
    grammarQuizEarnedPoints: 0,
    grammarQuizzesCompleted: 0,
    grammarQuizCompletedAt: 0,
    grammarHighlightEnabled: false,
    grammarHighlightTopicId: null,
    // Grammar games (all 5)
    grammarScrambleHighScore: 0,
    grammarWorkshopHighScore: 0,
    grammarSurgeryHighScore: 0,
    grammarRouletteHighScore: 0,
    grammarDuelHighScore: 0,
    grammarGameAccuracy: 0,
    grammarGamesCompleted: 0,
    grammarGameCompletedAt: 0,
    grammarScrambleAccuracy: 0,
    grammarWorkshopAccuracy: 0,
    grammarSurgeryAccuracy: 0,
    grammarRouletteAccuracy: 0,
    grammarDuelAccuracy: 0,
    grammarScrambleCompleted: 0,
    grammarWorkshopCompleted: 0,
    grammarSurgeryCompleted: 0,
    grammarRouletteCompleted: 0,
    grammarDuelCompleted: 0,
    // Workflow status
    status: "idle",
    error: null,
  }

  delete stripped.id
  delete stripped.createdAt
  delete stripped.updatedAt
  return stripped
}

/**
 * Compute the per-student progress percentage from a ReadingStore.
 * Thin wrapper around the single shared `calculateProgress` in
 * @/utils/progress — kept as a named export so existing callers are unaffected.
 */
export function calculateAssignmentProgress(session: ReadingStore): number {
  return calculateProgress(session)
}

export interface CreateAssignmentInput {
  teacherId: string
  title: string
  description?: string
  subject?: string
  dueDate?: string | null
  sourceSessionId?: string
  sourceSessionData: ReadingStore
  studentIds: string[]
}

/**
 * Create an assignment and a personal reading-session copy for every roster
 * student. Each student session:
 *   - is owned by the student
 *   - has source = 'assignment'
 *   - has assignment_id set (linking back to this assignment)
 *   - does NOT duplicate originalImages (the heavy payload) — they live only
 *     in the assignment snapshot
 *   - DOES copy the other content fields so the existing reading page renders
 *     without needing a snapshot join
 */
export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  const client = await getClient()
  try {
    await client.query("BEGIN")

    // 1. Insert the assignment row with the frozen snapshot
    const snapshot = stripSessionForAssignment(input.sourceSessionData)
    const assignmentResult = await client.query(
      `INSERT INTO assignments (
         teacher_id, title, description, subject,
         source_session_id, source_session_snapshot, source_doc_title, due_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at, updated_at`,
      [
        input.teacherId,
        input.title.trim(),
        input.description?.trim() || "",
        input.subject?.trim() || "",
        input.sourceSessionId || null,
        JSON.stringify(snapshot),
        input.sourceSessionData.docTitle || "",
        input.dueDate ? new Date(input.dueDate) : null,
      ],
    )
    const assignmentId = assignmentResult.rows[0].id
    const createdAt = assignmentResult.rows[0].created_at
    const updatedAt = assignmentResult.rows[0].updated_at

    // 2. For each student, create a personal session + submission row
    const { nanoid } = await import("nanoid")
    const studentSessionIds: string[] = []
    for (const studentId of input.studentIds) {
      if (studentId === input.teacherId) continue

      const studentSessionId = nanoid()
      studentSessionIds.push(studentSessionId)
      const now = Date.now()

      // Slimmed-down session: heavy originalImages omitted; content present.
      const studentSession = {
        ...(snapshot as unknown as ReadingStore),
        id: studentSessionId,
        source: "assignment" as const,
        originalImages: [] as string[],
        createdAt: now,
        updatedAt: now,
      }

      // Stamp assignment_id by writing it directly after createReadingSession
      // (createReadingSession doesn't know about assignment_id; we patch it
      // in the same transaction).
      // Note: createReadingSession starts its own BEGIN/COMMIT — to keep this
      // atomic we instead inline a minimal INSERT here.
      await client.query(
        `INSERT INTO reading_sessions (
           id, user_id, doc_title, source, student_age, extracted_text, summary,
           adapted_text, simplified_text, highlighted_words, analyzed_sentences,
           mind_map, visualization_image, visualization_generated_at, reading_test, glossary, glossary_ratings, test_score,
           test_completed, test_earned_points, test_total_points, test_show_chinese,
           test_mode, vocabulary_quiz_score, spelling_game_best_score, spelling_game_accuracy, chat_history,
           tests_completed, vocab_quizzes_completed, spelling_games_completed,
           original_difficulty, adapted_difficulty, simplified_difficulty,
           include_glossary, include_sentence_analysis,
           grammar_topics, grammar_quiz, grammar_quiz_score, grammar_quiz_completed,
           grammar_quizzes_completed,
           grammar_quiz_earned_points, grammar_quiz_total_points,
           grammar_generated_at, grammar_quiz_completed_at,
           grammar_highlight_enabled, grammar_highlight_topic_id,
           grammar_quiz_mode,
           grammar_scramble_high_score, grammar_workshop_high_score,
           grammar_surgery_high_score, grammar_roulette_high_score,
           grammar_duel_high_score, grammar_game_accuracy,
           grammar_games_completed, grammar_game_completed_at,
           grammar_scramble_accuracy, grammar_workshop_accuracy,
           grammar_surgery_accuracy, grammar_roulette_accuracy,
           grammar_duel_accuracy,
           grammar_scramble_completed, grammar_workshop_completed,
           grammar_surgery_completed, grammar_roulette_completed,
           grammar_duel_completed,
           grammar_error_challenges,
           grammar_scramble_challenges, grammar_workshop_challenges,
           grammar_game_questions,
            assignment_id, created_at, visualization_language, mind_map_language,
            summary_language
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
             $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
              $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58,
              $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74
            )`,
        [
          studentSession.id,
          studentId,
          studentSession.docTitle,
          "assignment",
          studentSession.studentAge,
          studentSession.extractedText ?? "",
          studentSession.summary ?? "",
          studentSession.adaptedText ?? "",
          studentSession.simplifiedText ?? "",
          JSON.stringify(studentSession.highlightedWords ?? []),
          JSON.stringify(studentSession.analyzedSentences ?? {}),
          studentSession.mindMap ?? "",
          studentSession.visualizationImage ?? "",
          studentSession.visualizationGeneratedAt ?? 0,
          JSON.stringify(studentSession.readingTest ?? []),
          JSON.stringify(studentSession.glossary ?? []),
          JSON.stringify(studentSession.glossaryRatings ?? {}),
          studentSession.testScore ?? 0,
          studentSession.testCompleted ?? false,
          studentSession.testEarnedPoints ?? 0,
          studentSession.testTotalPoints ?? 0,
          studentSession.testShowChinese ?? false,
          studentSession.testMode ?? "all-at-once",
          studentSession.vocabularyQuizScore ?? 0,
          studentSession.spellingGameBestScore ?? 0,
          studentSession.spellingGameAccuracy ?? 0,
          JSON.stringify(studentSession.chatHistory ?? []),
          studentSession.testsCompleted ?? 0,
          studentSession.vocabQuizzesCompleted ?? 0,
          studentSession.spellingGamesCompleted ?? 0,
          studentSession.originalDifficulty ? JSON.stringify(studentSession.originalDifficulty) : null,
          studentSession.adaptedDifficulty ? JSON.stringify(studentSession.adaptedDifficulty) : null,
          studentSession.simplifiedDifficulty ? JSON.stringify(studentSession.simplifiedDifficulty) : null,
          studentSession.includeGlossary ?? true,
          studentSession.includeSentenceAnalysis ?? true,
          JSON.stringify(studentSession.grammarTopics ?? []),
          JSON.stringify(studentSession.grammarQuiz ?? []),
          studentSession.grammarQuizScore ?? 0,
          studentSession.grammarQuizCompleted ?? false,
          studentSession.grammarQuizzesCompleted ?? 0,
          studentSession.grammarQuizEarnedPoints ?? 0,
          studentSession.grammarQuizTotalPoints ?? 0,
          studentSession.grammarGeneratedAt ?? 0,
          studentSession.grammarQuizCompletedAt ?? 0,
          studentSession.grammarHighlightEnabled ?? false,
          studentSession.grammarHighlightTopicId ?? null,
          studentSession.grammarQuizMode ?? "all-at-once",
          studentSession.grammarScrambleHighScore ?? 0,
          studentSession.grammarWorkshopHighScore ?? 0,
          studentSession.grammarSurgeryHighScore ?? 0,
          studentSession.grammarRouletteHighScore ?? 0,
          studentSession.grammarDuelHighScore ?? 0,
          studentSession.grammarGameAccuracy ?? 0,
          studentSession.grammarGamesCompleted ?? 0,
          null,
          studentSession.grammarScrambleAccuracy ?? 0,
          studentSession.grammarWorkshopAccuracy ?? 0,
          studentSession.grammarSurgeryAccuracy ?? 0,
          studentSession.grammarRouletteAccuracy ?? 0,
          studentSession.grammarDuelAccuracy ?? 0,
          studentSession.grammarScrambleCompleted ?? 0,
          studentSession.grammarWorkshopCompleted ?? 0,
          studentSession.grammarSurgeryCompleted ?? 0,
          studentSession.grammarRouletteCompleted ?? 0,
          studentSession.grammarDuelCompleted ?? 0,
          JSON.stringify(studentSession.grammarErrorChallenges ?? []),
          JSON.stringify(studentSession.grammarScrambleChallenges ?? []),
          JSON.stringify(studentSession.grammarWorkshopChallenges ?? []),
          JSON.stringify(studentSession.grammarGameQuestions ?? []),
          assignmentId,
          new Date(now),
          (studentSession.visualizationLanguage as "en" | "zh" | null) ?? null,
          (studentSession.mindMapLanguage as "en" | "zh" | null) ?? null,
          (studentSession.summaryLanguage as "en" | "zh" | null) ?? null,
        ],
      )

      await client.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, student_session_id)
         VALUES ($1, $2, $3)`,
        [assignmentId, studentId, studentSessionId],
      )
    }

    await client.query("COMMIT")

    // Seed initial progress for every student session now that content is in the DB.
    // Fire-and-forget — failures here don't affect the assignment creation response.
    for (const sessionId of studentSessionIds) {
      syncSubmissionMetrics(sessionId).catch(() => {})
    }

    // Non-blocking activity log
    logActivity(input.teacherId, "assignment_create", {
      details: {
        assignmentId,
        title: input.title,
        studentCount: input.studentIds.length,
      },
    }).catch(() => {})

    return {
      id: assignmentId,
      teacherId: input.teacherId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      subject: input.subject?.trim() || "",
      sourceSessionId: input.sourceSessionId,
      sourceDocTitle: input.sourceSessionData.docTitle || "",
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
      status: "active",
      studentCount: input.studentIds.length,
      avgProgress: 0,
      createdAt,
      updatedAt,
    }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

function mapAssignmentRow(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    teacherName: (row.teacher_name as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || "",
    subject: (row.subject as string) || "",
    sourceSessionId: (row.source_session_id as string) || undefined,
    sourceDocTitle: (row.source_doc_title as string) || "",
    dueDate: row.due_date ? new Date(row.due_date as string).toISOString() : null,
    status: row.status as AssignmentStatus,
    studentCount: (row.student_count as number) ?? 0,
    avgProgress: row.avg_progress != null ? Math.round(Number(row.avg_progress)) : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }
}

export async function getAssignmentsForTeacher(teacherId: string): Promise<Assignment[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT a.*,
              COALESCE(COUNT(s.id), 0)::int AS student_count,
              COALESCE(AVG(s.progress), 0)::float AS avg_progress
       FROM assignments a
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       WHERE a.teacher_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [teacherId],
    )
    return result.rows.map(mapAssignmentRow)
  } finally {
    client.release()
  }
}

/**
 * School-wide assignment list for admins: every assignment created by any
 * teacher in the school (including the admin's own, and archived ones).
 * Each row also carries a derived rosterName matched against the school's
 * saved presets (assignment_presets).
 */
export async function getSchoolAssignments(schoolId: string): Promise<Assignment[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT a.*,
              u.name AS teacher_name,
              COALESCE(COUNT(s.id), 0)::int AS student_count,
              COALESCE(AVG(s.progress), 0)::float AS avg_progress,
              ARRAY_REMOVE(ARRAY_AGG(s.student_id), NULL) AS roster_ids
       FROM assignments a
       JOIN users u ON u.id = a.teacher_id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       WHERE u.school_id = $1
       GROUP BY a.id, u.name
       ORDER BY a.created_at DESC`,
      [schoolId],
    )
    const presets = await getRosterPresets(client, schoolId)
    return result.rows.map((row) => ({
      ...mapAssignmentRow(row),
      rosterName: resolveRosterName(row.roster_ids ?? [], presets),
    }))
  } finally {
    client.release()
  }
}

/** Every assignment across all schools (super-admin oversight view). */
export async function getAllAssignments(): Promise<Assignment[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT a.*,
              u.name AS teacher_name,
              sc.name AS school_name,
              COALESCE(COUNT(s.id), 0)::int AS student_count,
              COALESCE(AVG(s.progress), 0)::float AS avg_progress,
              ARRAY_REMOVE(ARRAY_AGG(s.student_id), NULL) AS roster_ids
       FROM assignments a
       JOIN users u ON u.id = a.teacher_id
       LEFT JOIN schools sc ON sc.id = u.school_id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       GROUP BY a.id, u.name, sc.name
       ORDER BY a.created_at DESC`,
    )
    // Student ids belong to exactly one school, so cross-school set
    // matching is safe: only the student's own school presets can match.
    const presets = await getRosterPresets(client)
    return result.rows.map((row) => ({
      ...mapAssignmentRow(row),
      rosterName: resolveRosterName(row.roster_ids ?? [], presets),
      schoolName: (row.school_name as string) || undefined,
    }))
  } finally {
    client.release()
  }
}

interface RosterPresetRef {
  name: string
  studentIds: Set<string>
}

function rowToPresetRef(row: Record<string, unknown>): RosterPresetRef {
  const ids = Array.isArray(row.student_ids) ? (row.student_ids as string[]) : []
  return { name: row.name as string, studentIds: new Set(ids) }
}

/** Load saved roster presets for roster-name matching (all schools when schoolId is omitted). */
async function getRosterPresets(
  client: PoolClient,
  schoolId?: string,
): Promise<RosterPresetRef[]> {
  const { rows } = await client.query(
    schoolId
      ? `SELECT name, student_ids FROM assignment_presets
         WHERE school_id = $1 ORDER BY name ASC`
      : `SELECT name, student_ids FROM assignment_presets ORDER BY name ASC`,
    schoolId ? [schoolId] : [],
  )
  return rows.map(rowToPresetRef)
}

/**
 * Resolve an assignment's roster name by matching its student-id set against
 * the school's saved presets:
 *   1. exact set equality → that preset's name
 *   2. else the smallest preset whose set contains the roster (tolerates stale
 *      ids from students who have since left the preset)
 *   3. else undefined → rendered as "Custom"
 * Presets must be pre-sorted by name for deterministic exact-match results.
 */
function resolveRosterName(
  rosterIds: string[],
  presets: RosterPresetRef[],
): string | undefined {
  if (rosterIds.length === 0 || presets.length === 0) return undefined
  for (const p of presets) {
    if (
      p.studentIds.size === rosterIds.length &&
      rosterIds.every((id) => p.studentIds.has(id))
    ) {
      return p.name
    }
  }
  let best: RosterPresetRef | undefined
  for (const p of presets) {
    if (p.studentIds.size < rosterIds.length) continue
    if (rosterIds.every((id) => p.studentIds.has(id))) {
      if (!best || p.studentIds.size < best.studentIds.size) best = p
    }
  }
  return best?.name
}

export async function getAssignmentsForStudent(studentId: string): Promise<Assignment[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT a.*,
              u.name AS teacher_name,
              1::int AS student_count,
              s.progress AS avg_progress,
              s.last_viewed_at,
              s.submitted_at,
              s.student_session_id
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       LEFT JOIN users u ON u.id = a.teacher_id
       WHERE s.student_id = $1 AND a.status = 'active'
       ORDER BY a.created_at DESC`,
      [studentId],
    )
    const assignments = result.rows.map(mapAssignmentRow)
    // Attach student_session_id onto each assignment (typed via index signature)
    return assignments.map((a, i) => ({
      ...a,
      studentSessionId: result.rows[i].student_session_id ?? undefined,
    }))
  } finally {
    client.release()
  }
}

export async function getOverdueAssignmentCount(studentId: string): Promise<number> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = $1
         AND a.status = 'active'
         AND a.due_date IS NOT NULL
         AND a.due_date < NOW()
         AND COALESCE(s.progress, 0) < 100`,
      [studentId],
    )
    return result.rows[0]?.count ?? 0
  } finally {
    client.release()
  }
}

export async function getAssignment(
  assignmentId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<Assignment | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT a.*,
              COALESCE(COUNT(s_all.id), 0)::int AS student_count,
              COALESCE(AVG(s_all.progress), 0)::float AS avg_progress
       FROM assignments a
       LEFT JOIN assignment_submissions s_all ON s_all.assignment_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [assignmentId],
    )
    if (result.rows.length === 0) return null

    const assignment = mapAssignmentRow(result.rows[0])

    // RBAC: teacher owns it; student is on roster; admin/super-admin at school level
    if (requesterRole === "super-admin") return assignment
    if (requesterRole === "admin") {
      // Admin sees assignments in their school
      const [teacherSchool, requesterSchool] = await Promise.all([
        getSchoolForUser(assignment.teacherId),
        getSchoolForUser(requesterId),
      ])
      if (teacherSchool && teacherSchool === requesterSchool) return assignment
      return null
    }
    if (requesterRole === "teacher") {
      return assignment.teacherId === requesterId ? assignment : null
    }
    // Student: only if on roster — also attach their personal session id,
    // their individual progress (not the cross-student AVG from the main
    // query), and their cached scores for the scores summary card.
    const sub = await client.query(
      `SELECT student_session_id, progress,
              test_score, vocabulary_quiz_score, spelling_game_best_score,
              spelling_game_accuracy, grammar_quiz_score, grammar_game_best_score,
              grammar_game_accuracy
       FROM assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2`,
      [assignmentId, requesterId],
    )
    if (sub.rows.length === 0) return null
    // Archived assignments are hidden from students (kept for teacher reference)
    if (assignment.status === "archived") return null
    const r = sub.rows[0]
    return {
      ...assignment,
      studentSessionId: r.student_session_id ?? undefined,
      avgProgress: r.progress ?? 0,
      testScore: r.test_score,
      vocabularyQuizScore: r.vocabulary_quiz_score,
      spellingGameBestScore: r.spelling_game_best_score,
      spellingGameAccuracy: r.spelling_game_accuracy,
      grammarQuizScore: r.grammar_quiz_score,
      grammarGameBestScore: r.grammar_game_best_score,
      grammarGameAccuracy: r.grammar_game_accuracy,
    }
  } finally {
    client.release()
  }
}

export async function getAssignmentRoster(
  assignmentId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<AssignmentSubmission[] | null> {
  const client = await getClient()
  try {
    // Verify access
    const assignment = await getAssignment(assignmentId, requesterId, requesterRole)
    if (!assignment) return null

    const result = await client.query(
      `SELECT s.*,
              u.name AS student_name,
              u.email AS student_email,
              u.image AS student_image
       FROM assignment_submissions s
       JOIN users u ON u.id = s.student_id
       WHERE s.assignment_id = $1
       ORDER BY u.name, u.email`,
      [assignmentId],
    )
    return result.rows.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentImage: row.student_image,
      studentSessionId: row.student_session_id,
      progress: row.progress ?? 0,
      testScore: row.test_score,
      testCompleted: row.test_completed ?? false,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      spellingGameAccuracy: row.spelling_game_accuracy,
      grammarQuizScore: row.grammar_quiz_score,
      grammarGameBestScore: row.grammar_game_best_score,
      grammarGameAccuracy: row.grammar_game_accuracy,
      lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : null,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    }))
  } finally {
    client.release()
  }
}

export interface UpdateAssignmentInput {
  title?: string
  description?: string
  subject?: string
  dueDate?: string | null
  status?: AssignmentStatus
}

export async function updateAssignment(
  assignmentId: string,
  teacherId: string,
  updates: UpdateAssignmentInput,
): Promise<boolean> {
  const client = await getClient()
  try {
    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (updates.title !== undefined) {
      sets.push(`title = $${i++}`)
      values.push(updates.title.trim())
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${i++}`)
      values.push(updates.description.trim())
    }
    if (updates.subject !== undefined) {
      sets.push(`subject = $${i++}`)
      values.push(updates.subject.trim())
    }
    if (updates.dueDate !== undefined) {
      sets.push(`due_date = $${i++}`)
      values.push(updates.dueDate ? new Date(updates.dueDate) : null)
    }
    if (updates.status !== undefined) {
      sets.push(`status = $${i++}`)
      values.push(updates.status)
    }

    if (sets.length === 0) return true
    sets.push(`updated_at = NOW()`)
    values.push(assignmentId, teacherId)

    const result = await client.query(
      `UPDATE assignments SET ${sets.join(", ")}
       WHERE id = $${i++} AND teacher_id = $${i++}`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteAssignment(assignmentId: string, teacherId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `DELETE FROM assignments WHERE id = $1 AND teacher_id = $2`,
      [assignmentId, teacherId],
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/**
 * Mark a student's submission as viewed. Called when the student opens the
 * assignment session in the reading page.
 */
export async function markSubmissionViewed(
  assignmentId: string,
  studentId: string,
): Promise<void> {
  const client = await getClient()
  try {
    await client.query(
      `UPDATE assignment_submissions
       SET last_viewed_at = NOW()
       WHERE assignment_id = $1 AND student_id = $2`,
      [assignmentId, studentId],
    )
  } finally {
    client.release()
  }
}

/**
 * Sync cached metrics on an assignment_submissions row from the student's
 * latest session data. Reads the FULL session row from the DB so that partial
 * updates (which only carry the changed fields) don't zero-out fields that
 * weren't included in the current save payload.
 * Called from updateReadingSession after COMMIT. No-op if the session isn't
 * linked to any assignment.
 */
export async function syncSubmissionMetrics(
  studentSessionId: string,
): Promise<void> {
  const client = await getClient()
  try {
    // Fetch the full session row so calculateAssignmentProgress sees all fields.
    // The per-activity completion counters are also fetched so the cached
    // scores below can distinguish "not started" (→ NULL, renders as "-" in the
    // roster) from a genuine 0 score (→ 0, renders as "0").
    const sessionRes = await client.query(
      `SELECT extracted_text, pre_reading, student_prediction, collocations,
              summary, mind_map, visualization_image, visualization_generated_at,
              adapted_text, test_completed, analyzed_sentences, highlighted_words,
              glossary, spelling_game_best_score, spelling_game_accuracy, vocabulary_quiz_score,
              grammar_quiz_completed, grammar_quiz_score,
              grammar_scramble_high_score, grammar_workshop_high_score,
              grammar_surgery_high_score, grammar_roulette_high_score,
              grammar_duel_high_score, grammar_game_accuracy,
              test_score, vocab_quizzes_completed, spelling_games_completed,
              grammar_games_completed
       FROM reading_sessions WHERE id = $1`,
      [studentSessionId],
    )
    if (sessionRes.rows.length === 0) return

    const row = sessionRes.rows[0]
    // Map DB row to the shape expected by calculateAssignmentProgress
    const session: Partial<ReadingStore> = {
      extractedText: row.extracted_text ?? "",
      preReading: row.pre_reading ?? null,
      studentPrediction: row.student_prediction ?? "",
      collocations: row.collocations ?? [],
      summary: row.summary ?? "",
      mindMap: row.mind_map ?? "",
      visualizationImage: row.visualization_image ?? "",
      visualizationGeneratedAt: Number(row.visualization_generated_at ?? 0),
      adaptedText: row.adapted_text ?? "",
      testCompleted: row.test_completed ?? false,
      analyzedSentences: row.analyzed_sentences ?? {},
      highlightedWords: row.highlighted_words ?? [],
      glossary: row.glossary ?? [],
      spellingGameBestScore: row.spelling_game_best_score ?? 0,
      spellingGameAccuracy: row.spelling_game_accuracy ?? 0,
      vocabularyQuizScore: row.vocabulary_quiz_score ?? 0,
      grammarQuizCompleted: row.grammar_quiz_completed ?? false,
      grammarQuizScore: row.grammar_quiz_score ?? 0,
      grammarScrambleHighScore: row.grammar_scramble_high_score ?? 0,
      grammarWorkshopHighScore: row.grammar_workshop_high_score ?? 0,
      grammarSurgeryHighScore: row.grammar_surgery_high_score ?? 0,
      grammarRouletteHighScore: row.grammar_roulette_high_score ?? 0,
      grammarDuelHighScore: row.grammar_duel_high_score ?? 0,
      grammarGameAccuracy: row.grammar_game_accuracy ?? 0,
      testScore: row.test_score ?? 0,
    }

    const progress = calculateAssignmentProgress(session as ReadingStore)
    const grammarGameBest = grammarGameBestScore(session as ReadingStore)

    // Derive cached scores using each activity's completion flag as the
    // discriminator: not-yet-played → NULL (renders "-"), completed → the real
    // score (including a legitimate 0).
    const grammarGamesPlayed = (row.grammar_games_completed || 0) > 0
    const cachedTestScore = row.test_completed ? row.test_score ?? 0 : null
    const cachedVocabScore =
      (row.vocab_quizzes_completed || 0) > 0 ? row.vocabulary_quiz_score ?? 0 : null
    const cachedSpellingScore =
      (row.spelling_games_completed || 0) > 0 ? row.spelling_game_best_score ?? 0 : null
    const cachedSpellingAccuracy =
      (row.spelling_games_completed || 0) > 0 ? row.spelling_game_accuracy ?? 0 : null
    const cachedGrammarQuizScore = row.grammar_quiz_completed
      ? row.grammar_quiz_score ?? 0
      : null
    const cachedGrammarGameBest = grammarGamesPlayed ? grammarGameBest : null
    const cachedGrammarGameAccuracy = grammarGamesPlayed ? row.grammar_game_accuracy ?? 0 : null

    await client.query(
      `UPDATE assignment_submissions SET
         progress = $1,
         test_score = $2,
         test_completed = $3,
         vocabulary_quiz_score = $4,
         spelling_game_best_score = $5,
         grammar_quiz_score = $6,
         grammar_game_best_score = $7,
         grammar_game_accuracy = $8,
         spelling_game_accuracy = $9
       WHERE student_session_id = $10`,
      [
        progress,
        cachedTestScore,
        session.testCompleted ?? false,
        cachedVocabScore,
        cachedSpellingScore,
        cachedGrammarQuizScore,
        cachedGrammarGameBest,
        cachedGrammarGameAccuracy,
        cachedSpellingAccuracy,
        studentSessionId,
      ],
    )
  } finally {
    client.release()
  }
}

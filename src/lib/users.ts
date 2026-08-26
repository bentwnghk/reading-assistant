import { getClient } from "./db"
import { ensureSchoolSubscriptionTables } from "./school-subscription"
import { calculateProgress as sharedCalculateProgress } from "@/utils/progress"

export type UserRole = 'super-admin' | 'admin' | 'teacher' | 'student'

export type BillingMode = 'subscription' | 'local' | 'proxy'

export const VALID_BILLING_MODES: readonly BillingMode[] = ['subscription', 'local', 'proxy'] as const

export function normalizeBillingMode(raw: unknown): BillingMode | null {
  return VALID_BILLING_MODES.includes(raw as BillingMode) ? (raw as BillingMode) : null
}

export interface SchoolInfo {
  id: string
  name: string
  domain: string
  userCount?: number
  createdAt: number
}

export interface UserWithRole {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: UserRole
  classId?: string
  className?: string
  classIds?: string[]
  classNames?: string[]
  taughtClassIds?: string[]
  taughtClassNames?: string[]
  schoolId?: string
  schoolName?: string
  schoolAccessEndsAt?: string | null
  schoolManuallyRemoved?: boolean
  billingMode?: BillingMode | null
  hasActiveSubscription?: boolean
  hasMeterApiKey?: boolean
  hasAccessPassword?: boolean
  banned?: boolean
  createdAt?: number
}

// Aggregates a student's class memberships into arrays (multi-class capable)
// without fan-out: one output row per user. Also exposes the first membership
// as legacy singular classId/className for backward compatibility.
const CLASS_MEMBERSHIP_JOIN = `
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(json_agg(cm.class_id ORDER BY cm.joined_at, cm.class_id), '[]'::json) AS class_ids,
      COALESCE(json_agg(c.name ORDER BY cm.joined_at, cm.class_id), '[]'::json) AS class_names
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = u.id
  ) m ON TRUE`

const CLASS_MEMBERSHIP_SELECT = `
  m.class_ids AS "classIds",
  m.class_names AS "classNames",
  m.class_ids->>0 AS "classId",
  m.class_names->>0 AS "className"`

export interface ClassInfo {
  id: string
  name: string
  description?: string
  teacherId?: string
  teacherName?: string
  schoolId?: string
  schoolName?: string
  subjectId?: string
  subjectName?: string
  gradeId?: string
  gradeName?: string
  studentCount?: number
  createdAt: number
}

export interface ClassMember {
  studentId: string
  studentName?: string
  studentEmail?: string
  studentImage?: string
  joinedAt: number
}

export interface StudentSessionData {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  docTitle: string
  studentAge: number
  extractedText?: string
  summary?: string
  testScore?: number
  testCompleted?: boolean
  vocabularyQuizScore?: number
  spellingGameBestScore?: number
  spellingGameAccuracy?: number
  grammarQuizScore?: number
  grammarQuizCompleted?: boolean
  grammarGameBestScore?: number
  grammarGameAccuracy?: number
  glossaryCount: number
  glossary?: GlossaryEntry[]
  highlightedWords?: string[]
  analyzedSentences?: Record<string, SentenceAnalysis>
  adaptedText?: string
  simplifiedText?: string
  vocabularyQuiz?: VocabularyQuizQuestion[]
  readingTest?: ReadingTestQuestion[]
  grammarQuiz?: GrammarQuizQuestion[]
  progress: number
  createdAt: number
  updatedAt: number
}

export interface TeacherSessionData {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  docTitle: string
  studentAge: number
  summary: boolean
  adaptedText: boolean
  simplifiedText: boolean
  mindMap: boolean
  testScore: number | null
  testCompleted: boolean
  vocabularyQuizScore: number | null
  spellingGameBestScore: number | null
  spellingGameAccuracy: number | null
  testsCompleted: number
  vocabQuizzesCompleted: number
  spellingGamesCompleted: number
  grammarQuizScore: number | null
  grammarQuizCompleted: boolean
  grammarQuizzesCompleted: number
  grammarGameBestScore: number | null
  grammarGameAccuracy: number | null
  grammarGamesCompleted: number
  grammarGameCompletedAt: number
  glossaryCount: number
  sentenceAnalysisCount: number
  /** Per-sentence-analysis timestamps — used for the daily activity chart (date-accurate). */
  sentenceAnalysisTimestamps: number[]
  tutorQuestionCount: number
  /** Per-user tutor-message timestamps — used for the daily activity chart (date-accurate). */
  tutorQuestionTimestamps: number[]
  flashcardReviewCount: number
  /** Per-flashcard-review timestamps — used for the daily activity chart (date-accurate). */
  flashcardReviewTimestamps: number[]
  grammarAnalysisCount: number
  grammarGeneratedAt: number
  grammarQuizCompletedAt: number
  progress: number
  createdAt: number
  updatedAt: number
  summaryGeneratedAt: number
  mindMapGeneratedAt: number
  adaptedTextGeneratedAt: number
  simplifiedTextGeneratedAt: number
  glossaryGeneratedAt: number
  spellingGameCompletedAt: number
  vocabQuizCompletedAt: number
  readingTestCompletedAt: number
  visualization: boolean
  visualizationGeneratedAt: number
  preReading: boolean
  preReadingGeneratedAt: number
  collocations: boolean
  collocationsGeneratedAt: number
}

export async function getTeacherDashboardData(classId: string): Promise<TeacherSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title,
        rs.summary IS NOT NULL AND rs.summary != '' as summary,
        rs.adapted_text IS NOT NULL AND rs.adapted_text != '' as adapted_text,
        rs.simplified_text IS NOT NULL AND rs.simplified_text != '' as simplified_text,
        rs.mind_map IS NOT NULL AND rs.mind_map != '' as mind_map,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        COALESCE(rs.tests_completed, 0) as tests_completed,
        COALESCE(rs.vocab_quizzes_completed, 0) as vocab_quizzes_completed,
        COALESCE(rs.spelling_games_completed, 0) as spelling_games_completed,
        COALESCE(rs.spelling_game_accuracy, 0) as spelling_game_accuracy,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        COALESCE(rs.grammar_quizzes_completed, 0) as grammar_quizzes_completed,
        GREATEST(COALESCE(rs.grammar_scramble_high_score,0), COALESCE(rs.grammar_workshop_high_score,0), COALESCE(rs.grammar_surgery_high_score,0), COALESCE(rs.grammar_roulette_high_score,0), COALESCE(rs.grammar_duel_high_score,0)) as grammar_game_best_score,
        COALESCE(rs.grammar_game_accuracy, 0) as grammar_game_accuracy,
        COALESCE(rs.grammar_games_completed, 0) as grammar_games_completed,
        rs.grammar_game_completed_at,
        rs.pre_reading, rs.student_prediction, rs.collocations,
        rs.pre_reading IS NOT NULL as has_pre_reading,
        rs.pre_reading_generated_at,
        rs.collocations_generated_at,
        rs.extracted_text IS NOT NULL AND rs.extracted_text != '' as extracted_text,
        rs.highlighted_words,
        rs.glossary, rs.analyzed_sentences, rs.chat_history, rs.flashcard_review_dates,
        rs.grammar_topics, rs.grammar_generated_at, rs.grammar_quiz_completed_at,
        rs.created_at, rs.updated_at,
        rs.summary_generated_at, rs.mind_map_generated_at,
        rs.adapted_text_generated_at, rs.simplified_text_generated_at,
        rs.glossary_generated_at, rs.spelling_game_completed_at,
        rs.vocab_quiz_completed_at, rs.reading_test_completed_at,
        rs.visualization_image IS NOT NULL AND rs.visualization_image != '' as visualization,
        rs.visualization_generated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN class_members cm ON rs.user_id = cm.student_id
       JOIN users u ON rs.user_id = u.id
       WHERE cm.class_id = $1
         AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY rs.updated_at DESC`,
      [classId]
    )

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || 'Untitled',
      studentAge: row.student_age || 13,
      summary: !!row.summary,
      adaptedText: !!row.adapted_text,
      simplifiedText: !!row.simplified_text,
      mindMap: !!row.mind_map,
      testScore: row.test_score || null,
      testCompleted: !!row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score || null,
      spellingGameBestScore: row.spelling_game_best_score || null,
      spellingGameAccuracy: row.spelling_game_accuracy || null,
      testsCompleted: row.tests_completed ?? 0,
      vocabQuizzesCompleted: row.vocab_quizzes_completed ?? 0,
      spellingGamesCompleted: row.spelling_games_completed ?? 0,
      grammarQuizScore: row.grammar_quiz_score || null,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarQuizzesCompleted: row.grammar_quizzes_completed ?? 0,
      grammarGameBestScore: row.grammar_game_best_score || null,
      grammarGameAccuracy: row.grammar_game_accuracy || null,
      grammarGamesCompleted: row.grammar_games_completed ?? 0,
      grammarGameCompletedAt: Number(row.grammar_game_completed_at) || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      sentenceAnalysisCount: Object.keys(row.analyzed_sentences || {}).length,
      sentenceAnalysisTimestamps: row.analyzed_sentences && typeof row.analyzed_sentences === 'object'
        ? (Object.values(row.analyzed_sentences) as Array<{ createdAt?: number }>)
            .map((e) => Number(e?.createdAt) || 0)
        : [],
      tutorQuestionCount: Array.isArray(row.chat_history)
        ? row.chat_history.filter((m: { role: string }) => m.role === 'user').length
        : 0,
      tutorQuestionTimestamps: Array.isArray(row.chat_history)
        ? row.chat_history
            .filter((m: { role: string; timestamp?: number }) => m.role === 'user')
            .map((m: { timestamp?: number }) => Number(m.timestamp) || 0)
        : [],
      flashcardReviewCount: Array.isArray(row.flashcard_review_dates) ? row.flashcard_review_dates.length : 0,
      flashcardReviewTimestamps: Array.isArray(row.flashcard_review_dates)
        ? row.flashcard_review_dates.map((ts: unknown) => Number(ts) || 0)
        : [],
      grammarAnalysisCount: Array.isArray(row.grammar_topics) ? row.grammar_topics.length : 0,
      grammarGeneratedAt: Number(row.grammar_generated_at) || 0,
      grammarQuizCompletedAt: Number(row.grammar_quiz_completed_at) || 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      summaryGeneratedAt: Number(row.summary_generated_at) || 0,
      mindMapGeneratedAt: Number(row.mind_map_generated_at) || 0,
      adaptedTextGeneratedAt: Number(row.adapted_text_generated_at) || 0,
      simplifiedTextGeneratedAt: Number(row.simplified_text_generated_at) || 0,
      glossaryGeneratedAt: Number(row.glossary_generated_at) || 0,
      spellingGameCompletedAt: Number(row.spelling_game_completed_at) || 0,
      vocabQuizCompletedAt: Number(row.vocab_quiz_completed_at) || 0,
      readingTestCompletedAt: Number(row.reading_test_completed_at) || 0,
      visualization: !!row.visualization,
      visualizationGeneratedAt: Number(row.visualization_generated_at) || 0,
      preReading: !!row.has_pre_reading,
      preReadingGeneratedAt: Number(row.pre_reading_generated_at) || 0,
      collocations: Array.isArray(row.collocations) && row.collocations.length > 0,
      collocationsGeneratedAt: Number(row.collocations_generated_at) || 0,
    }))
  } finally {
    client.release()
  }
}

export async function getTeacherDashboardDataForSchool(schoolId: string): Promise<TeacherSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title,
        rs.summary IS NOT NULL AND rs.summary != '' as summary,
        rs.adapted_text IS NOT NULL AND rs.adapted_text != '' as adapted_text,
        rs.simplified_text IS NOT NULL AND rs.simplified_text != '' as simplified_text,
        rs.mind_map IS NOT NULL AND rs.mind_map != '' as mind_map,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        COALESCE(rs.tests_completed, 0) as tests_completed,
        COALESCE(rs.vocab_quizzes_completed, 0) as vocab_quizzes_completed,
        COALESCE(rs.spelling_games_completed, 0) as spelling_games_completed,
        COALESCE(rs.spelling_game_accuracy, 0) as spelling_game_accuracy,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        COALESCE(rs.grammar_quizzes_completed, 0) as grammar_quizzes_completed,
        GREATEST(COALESCE(rs.grammar_scramble_high_score,0), COALESCE(rs.grammar_workshop_high_score,0), COALESCE(rs.grammar_surgery_high_score,0), COALESCE(rs.grammar_roulette_high_score,0), COALESCE(rs.grammar_duel_high_score,0)) as grammar_game_best_score,
        COALESCE(rs.grammar_game_accuracy, 0) as grammar_game_accuracy,
        COALESCE(rs.grammar_games_completed, 0) as grammar_games_completed,
        rs.grammar_game_completed_at,
        rs.pre_reading, rs.student_prediction, rs.collocations,
        rs.pre_reading IS NOT NULL as has_pre_reading,
        rs.pre_reading_generated_at,
        rs.collocations_generated_at,
        rs.extracted_text IS NOT NULL AND rs.extracted_text != '' as extracted_text,
        rs.highlighted_words,
        rs.glossary, rs.analyzed_sentences, rs.chat_history, rs.flashcard_review_dates,
        rs.grammar_topics, rs.grammar_generated_at, rs.grammar_quiz_completed_at,
        rs.created_at, rs.updated_at,
        rs.summary_generated_at, rs.mind_map_generated_at,
        rs.adapted_text_generated_at, rs.simplified_text_generated_at,
        rs.glossary_generated_at, rs.spelling_game_completed_at,
        rs.vocab_quiz_completed_at, rs.reading_test_completed_at,
        rs.visualization_image IS NOT NULL AND rs.visualization_image != '' as visualization,
        rs.visualization_generated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.school_id = $1 AND COALESCE(ur.role, 'student') = 'student'
         AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY rs.updated_at DESC`,
      [schoolId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || 'Untitled',
      studentAge: row.student_age || 13,
      summary: !!row.summary,
      adaptedText: !!row.adapted_text,
      simplifiedText: !!row.simplified_text,
      mindMap: !!row.mind_map,
      testScore: row.test_score || null,
      testCompleted: !!row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score || null,
      spellingGameBestScore: row.spelling_game_best_score || null,
      spellingGameAccuracy: row.spelling_game_accuracy || null,
      testsCompleted: row.tests_completed ?? 0,
      vocabQuizzesCompleted: row.vocab_quizzes_completed ?? 0,
      spellingGamesCompleted: row.spelling_games_completed ?? 0,
      grammarQuizScore: row.grammar_quiz_score || null,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarQuizzesCompleted: row.grammar_quizzes_completed ?? 0,
      grammarGameBestScore: row.grammar_game_best_score || null,
      grammarGameAccuracy: row.grammar_game_accuracy || null,
      grammarGamesCompleted: row.grammar_games_completed ?? 0,
      grammarGameCompletedAt: Number(row.grammar_game_completed_at) || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      sentenceAnalysisCount: Object.keys(row.analyzed_sentences || {}).length,
      sentenceAnalysisTimestamps: row.analyzed_sentences && typeof row.analyzed_sentences === 'object'
        ? (Object.values(row.analyzed_sentences) as Array<{ createdAt?: number }>)
            .map((e) => Number(e?.createdAt) || 0)
        : [],
      tutorQuestionCount: Array.isArray(row.chat_history)
        ? row.chat_history.filter((m: { role: string }) => m.role === 'user').length
        : 0,
      tutorQuestionTimestamps: Array.isArray(row.chat_history)
        ? row.chat_history
            .filter((m: { role: string; timestamp?: number }) => m.role === 'user')
            .map((m: { timestamp?: number }) => Number(m.timestamp) || 0)
        : [],
      flashcardReviewCount: Array.isArray(row.flashcard_review_dates) ? row.flashcard_review_dates.length : 0,
      flashcardReviewTimestamps: Array.isArray(row.flashcard_review_dates)
        ? row.flashcard_review_dates.map((ts: unknown) => Number(ts) || 0)
        : [],
      grammarAnalysisCount: Array.isArray(row.grammar_topics) ? row.grammar_topics.length : 0,
      grammarGeneratedAt: Number(row.grammar_generated_at) || 0,
      grammarQuizCompletedAt: Number(row.grammar_quiz_completed_at) || 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      summaryGeneratedAt: Number(row.summary_generated_at) || 0,
      mindMapGeneratedAt: Number(row.mind_map_generated_at) || 0,
      adaptedTextGeneratedAt: Number(row.adapted_text_generated_at) || 0,
      simplifiedTextGeneratedAt: Number(row.simplified_text_generated_at) || 0,
      glossaryGeneratedAt: Number(row.glossary_generated_at) || 0,
      spellingGameCompletedAt: Number(row.spelling_game_completed_at) || 0,
      vocabQuizCompletedAt: Number(row.vocab_quiz_completed_at) || 0,
      readingTestCompletedAt: Number(row.reading_test_completed_at) || 0,
      visualization: !!row.visualization,
      visualizationGeneratedAt: Number(row.visualization_generated_at) || 0,
      preReading: !!row.has_pre_reading,
      preReadingGeneratedAt: Number(row.pre_reading_generated_at) || 0,
      collocations: Array.isArray(row.collocations) && row.collocations.length > 0,
      collocationsGeneratedAt: Number(row.collocations_generated_at) || 0,
    }))
  } finally {
    client.release()
  }
}

export async function getTeacherDashboardDataAllSchools(): Promise<TeacherSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title,
        rs.summary IS NOT NULL AND rs.summary != '' as summary,
        rs.adapted_text IS NOT NULL AND rs.adapted_text != '' as adapted_text,
        rs.simplified_text IS NOT NULL AND rs.simplified_text != '' as simplified_text,
        rs.mind_map IS NOT NULL AND rs.mind_map != '' as mind_map,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        COALESCE(rs.tests_completed, 0) as tests_completed,
        COALESCE(rs.vocab_quizzes_completed, 0) as vocab_quizzes_completed,
        COALESCE(rs.spelling_games_completed, 0) as spelling_games_completed,
        COALESCE(rs.spelling_game_accuracy, 0) as spelling_game_accuracy,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        COALESCE(rs.grammar_quizzes_completed, 0) as grammar_quizzes_completed,
        GREATEST(COALESCE(rs.grammar_scramble_high_score,0), COALESCE(rs.grammar_workshop_high_score,0), COALESCE(rs.grammar_surgery_high_score,0), COALESCE(rs.grammar_roulette_high_score,0), COALESCE(rs.grammar_duel_high_score,0)) as grammar_game_best_score,
        COALESCE(rs.grammar_game_accuracy, 0) as grammar_game_accuracy,
        COALESCE(rs.grammar_games_completed, 0) as grammar_games_completed,
        rs.grammar_game_completed_at,
        rs.pre_reading, rs.student_prediction, rs.collocations,
        rs.pre_reading IS NOT NULL as has_pre_reading,
        rs.pre_reading_generated_at,
        rs.collocations_generated_at,
        rs.extracted_text IS NOT NULL AND rs.extracted_text != '' as extracted_text,
        rs.highlighted_words,
        rs.glossary, rs.analyzed_sentences, rs.chat_history, rs.flashcard_review_dates,
        rs.grammar_topics, rs.grammar_generated_at, rs.grammar_quiz_completed_at,
        rs.created_at, rs.updated_at,
        rs.summary_generated_at, rs.mind_map_generated_at,
        rs.adapted_text_generated_at, rs.simplified_text_generated_at,
        rs.glossary_generated_at, rs.spelling_game_completed_at,
        rs.vocab_quiz_completed_at, rs.reading_test_completed_at,
        rs.visualization_image IS NOT NULL AND rs.visualization_image != '' as visualization,
        rs.visualization_generated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE COALESCE(ur.role, 'student') = 'student'
         AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY rs.updated_at DESC`
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || 'Untitled',
      studentAge: row.student_age || 13,
      summary: !!row.summary,
      adaptedText: !!row.adapted_text,
      simplifiedText: !!row.simplified_text,
      mindMap: !!row.mind_map,
      testScore: row.test_score || null,
      testCompleted: !!row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score || null,
      spellingGameBestScore: row.spelling_game_best_score || null,
      spellingGameAccuracy: row.spelling_game_accuracy || null,
      testsCompleted: row.tests_completed ?? 0,
      vocabQuizzesCompleted: row.vocab_quizzes_completed ?? 0,
      spellingGamesCompleted: row.spelling_games_completed ?? 0,
      grammarQuizScore: row.grammar_quiz_score || null,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarQuizzesCompleted: row.grammar_quizzes_completed ?? 0,
      grammarGameBestScore: row.grammar_game_best_score || null,
      grammarGameAccuracy: row.grammar_game_accuracy || null,
      grammarGamesCompleted: row.grammar_games_completed ?? 0,
      grammarGameCompletedAt: Number(row.grammar_game_completed_at) || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      sentenceAnalysisCount: Object.keys(row.analyzed_sentences || {}).length,
      sentenceAnalysisTimestamps: row.analyzed_sentences && typeof row.analyzed_sentences === 'object'
        ? (Object.values(row.analyzed_sentences) as Array<{ createdAt?: number }>)
            .map((e) => Number(e?.createdAt) || 0)
        : [],
      tutorQuestionCount: Array.isArray(row.chat_history)
        ? row.chat_history.filter((m: { role: string }) => m.role === 'user').length
        : 0,
      tutorQuestionTimestamps: Array.isArray(row.chat_history)
        ? row.chat_history
            .filter((m: { role: string; timestamp?: number }) => m.role === 'user')
            .map((m: { timestamp?: number }) => Number(m.timestamp) || 0)
        : [],
      flashcardReviewCount: Array.isArray(row.flashcard_review_dates) ? row.flashcard_review_dates.length : 0,
      flashcardReviewTimestamps: Array.isArray(row.flashcard_review_dates)
        ? row.flashcard_review_dates.map((ts: unknown) => Number(ts) || 0)
        : [],
      grammarAnalysisCount: Array.isArray(row.grammar_topics) ? row.grammar_topics.length : 0,
      grammarGeneratedAt: Number(row.grammar_generated_at) || 0,
      grammarQuizCompletedAt: Number(row.grammar_quiz_completed_at) || 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      summaryGeneratedAt: Number(row.summary_generated_at) || 0,
      mindMapGeneratedAt: Number(row.mind_map_generated_at) || 0,
      adaptedTextGeneratedAt: Number(row.adapted_text_generated_at) || 0,
      simplifiedTextGeneratedAt: Number(row.simplified_text_generated_at) || 0,
      glossaryGeneratedAt: Number(row.glossary_generated_at) || 0,
      spellingGameCompletedAt: Number(row.spelling_game_completed_at) || 0,
      vocabQuizCompletedAt: Number(row.vocab_quiz_completed_at) || 0,
      readingTestCompletedAt: Number(row.reading_test_completed_at) || 0,
      visualization: !!row.visualization,
      visualizationGeneratedAt: Number(row.visualization_generated_at) || 0,
      preReading: !!row.has_pre_reading,
      preReadingGeneratedAt: Number(row.pre_reading_generated_at) || 0,
      collocations: Array.isArray(row.collocations) && row.collocations.length > 0,
      collocationsGeneratedAt: Number(row.collocations_generated_at) || 0,
    }))
  } finally {
    client.release()
  }
}

export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || ''
  return adminEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails()
  return adminEmails.includes(email.toLowerCase())
}

export function getSuperAdminEmails(): string[] {
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS || ''
  return superAdminEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
}

export function isSuperAdminEmail(email: string): boolean {
  const superAdminEmails = getSuperAdminEmails()
  return superAdminEmails.includes(email.toLowerCase())
}

export async function getUserRole(userId: string, email?: string | null): Promise<UserRole> {
  if (email && isSuperAdminEmail(email)) {
    return 'super-admin'
  }
  
  if (email && isAdminEmail(email)) {
    return 'admin'
  }
  
  const client = await getClient()
  try {
    const result = await client.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    )
    
    if (result.rows.length > 0) {
      return result.rows[0].role as UserRole
    }
    
    return 'student'
  } finally {
    client.release()
  }
}

export async function ensureUserRole(userId: string, email?: string | null): Promise<UserRole> {
  const role = await getUserRole(userId, email)
  
  const client = await getClient()
  try {
    if (role === 'super-admin' || role === 'admin') {
      try {
        await client.query(
          `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET role = $2`,
          [userId, role]
        )
      } catch {
        // If INSERT fails (e.g., check constraint not updated), role is still valid
        // based on email configuration
      }
    } else {
      const existingResult = await client.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
      )
      
      if (existingResult.rows.length === 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role) VALUES ($1, 'student')`,
          [userId]
        )
      }
    }
    
    return role
  } finally {
    client.release()
  }
}

export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET role = $2`,
      [userId, role]
    )
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * Returns true if the user (looked up by id or email) is banned.
 * Email lookup covers first-time sign-ins where the users row may be
 * referenced by email before the adapter exposes the id.
 */
export async function isUserBanned(userId?: string | null, email?: string | null): Promise<boolean> {
  if (!userId && !email) return false
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT COALESCE(banned, FALSE) as banned FROM users WHERE id = $1 OR email = $2 LIMIT 1`,
      [userId ?? null, email ? email.toLowerCase() : null]
    )
    return result.rows.length > 0 && !!result.rows[0].banned
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * Ban or unban a user. Banning also deletes all their sessions so any
 * active login (database session strategy) is terminated immediately.
 */
export async function setUserBanned(userId: string, banned: boolean): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE users SET banned = $1 WHERE id = $2`,
      [banned, userId]
    )
    if ((result.rowCount ?? 0) === 0) return false
    if (banned) {
      await client.query(`DELETE FROM sessions WHERE "userId" = $1`, [userId])
    }
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

export async function getAllUsers(): Promise<UserWithRole[]> {
  await ensureSchoolSubscriptionTables()
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        ${CLASS_MEMBERSHIP_SELECT},
        u.school_id as "schoolId",
        s.name as "schoolName",
        u.school_access_ends_at as "schoolAccessEndsAt",
        COALESCE(u.school_manually_removed, FALSE) as "schoolManuallyRemoved",
        COALESCE(u.banned, FALSE) as "banned",
        us.settings->>'mode' as "billingMode",
        (
          EXISTS (
            SELECT 1 FROM subscriptions ps
            WHERE ps.user_id = u.id AND ps.status IN ('active', 'trialing')
          )
          OR EXISTS (
            SELECT 1 FROM school_subscriptions ss
            WHERE ss.school_id = u.school_id AND ss.status IN ('active', 'trialing')
          )
        ) as "hasActiveSubscription",
        (
          us.settings->>'mode' = 'local'
          AND (
            (us.settings->>'provider' = 'openai'
             AND COALESCE(us.settings->>'openAIApiKey', '') <> '')
            OR (us.settings->>'provider' = 'openaicompatible'
             AND COALESCE(us.settings->>'openaicompatibleApiKey', '') <> '')
          )
        ) as "hasMeterApiKey",
        (
          us.settings->>'mode' = 'proxy'
          AND COALESCE(us.settings->>'accessPassword', '') <> ''
        ) as "hasAccessPassword",
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       ${CLASS_MEMBERSHIP_JOIN}
       LEFT JOIN schools s ON u.school_id = s.id
       LEFT JOIN user_settings us ON u.id = us.user_id
       ORDER BY u."createdAt" DESC`
      )
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      classId: row.classId,
      className: row.className,
      classIds: row.classIds || [],
      classNames: row.classNames || [],
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      schoolAccessEndsAt: row.schoolAccessEndsAt || null,
      schoolManuallyRemoved: row.schoolManuallyRemoved || false,
      billingMode: normalizeBillingMode(row.billingMode),
      hasActiveSubscription: !!row.hasActiveSubscription,
      hasMeterApiKey: !!row.hasMeterApiKey,
      hasAccessPassword: !!row.hasAccessPassword,
      banned: !!row.banned,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

// ─── School CRUD ───────────────────────────────────────────────────────────────

export async function getOrCreateSchoolByDomain(domain: string): Promise<SchoolInfo> {
  const client = await getClient()
  try {
    // Upsert: insert if not present, return existing otherwise
    const result = await client.query(
      `INSERT INTO schools (name, domain)
       VALUES ($1, $2)
       ON CONFLICT (domain) DO UPDATE SET domain = EXCLUDED.domain
       RETURNING id, name, domain, created_at`,
      [domain, domain]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      createdAt: new Date(row.created_at).getTime(),
    }
  } finally {
    client.release()
  }
}

export async function ensureUserSchool(userId: string, email: string): Promise<void> {
  await ensureSchoolManuallyRemovedColumn()
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return
  const domain = email.slice(atIndex + 1).toLowerCase()
  if (!domain) return

  const school = await getOrCreateSchoolByDomain(domain)

  const client = await getClient()
  try {
    await client.query(
      `UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL AND school_manually_removed = FALSE`,
      [school.id, userId]
    )
  } finally {
    client.release()
  }
}

export async function getAllSchools(): Promise<SchoolInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT
        s.id, s.name, s.domain, s.created_at,
        COUNT(u.id) AS user_count
       FROM schools s
       LEFT JOIN users u ON u.school_id = s.id
       GROUP BY s.id, s.name, s.domain, s.created_at
       ORDER BY s.created_at DESC`
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      userCount: parseInt(row.user_count) || 0,
      createdAt: new Date(row.created_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getSchoolById(schoolId: string): Promise<SchoolInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT id, name, domain, created_at FROM schools WHERE id = $1`,
      [schoolId]
    )
    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      createdAt: new Date(row.created_at).getTime(),
    }
  } finally {
    client.release()
  }
}

export async function updateSchoolName(schoolId: string, name: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE schools SET name = $1 WHERE id = $2`,
      [name, schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteSchool(schoolId: string): Promise<boolean> {
  const client = await getClient()
  try {
    // FK ON DELETE SET NULL will un-assign users automatically
    const result = await client.query(
      `DELETE FROM schools WHERE id = $1`,
      [schoolId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function assignUserSchool(userId: string, schoolId: string | null): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE users SET school_id = $1, school_manually_removed = FALSE WHERE id = $2`,
      [schoolId, userId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function createClass(
  name: string,
  description: string,
  teacherId?: string,
  schoolId?: string,
  subjectId?: string,
  gradeId?: string
): Promise<ClassInfo | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `INSERT INTO classes (name, description, teacher_id, school_id, subject_id, grade_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, description, teacher_id, school_id, subject_id, grade_id, created_at`,
      [name, description, teacherId || null, schoolId || null, subjectId || null, gradeId || null]
    )
    
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      teacherId: row.teacher_id,
      schoolId: row.school_id,
      subjectId: row.subject_id || undefined,
      gradeId: row.grade_id || undefined,
      createdAt: new Date(row.created_at).getTime(),
    }
  } catch {
    return null
  } finally {
    client.release()
  }
}

export async function updateClass(
  classId: string,
  name: string,
  description: string,
  teacherId?: string,
  schoolId?: string,
  subjectId?: string,
  gradeId?: string
): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `UPDATE classes SET name = $1, description = $2, teacher_id = $3, school_id = $4, subject_id = $5, grade_id = $6 WHERE id = $7`,
      [name, description, teacherId || null, schoolId || null, subjectId || null, gradeId || null, classId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

export async function deleteClass(classId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query('DELETE FROM classes WHERE id = $1', [classId])
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

const CLASS_SELECT = `
  SELECT 
    c.id, c.name, c.description, c.teacher_id, c.school_id, c.subject_id, c.grade_id, c.created_at,
    u.name as teacher_name,
    s.name as school_name,
    sub.name as subject_name,
    g.name as grade_name,
    (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count
  FROM classes c
  LEFT JOIN users u ON c.teacher_id = u.id
  LEFT JOIN schools s ON c.school_id = s.id
  LEFT JOIN subjects sub ON c.subject_id = sub.id
  LEFT JOIN grades g ON c.grade_id = g.id
`

function mapClassRow(row: Record<string, unknown>): ClassInfo {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    teacherId: row.teacher_id as string | undefined,
    teacherName: row.teacher_name as string | undefined,
    schoolId: row.school_id as string | undefined,
    schoolName: row.school_name as string | undefined,
    subjectId: (row.subject_id as string | null) || undefined,
    subjectName: (row.subject_name as string | null) || undefined,
    gradeId: (row.grade_id as string | null) || undefined,
    gradeName: (row.grade_name as string | null) || undefined,
    studentCount: parseInt(row.student_count as string) || 0,
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

export async function getAllClasses(): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} ORDER BY c.created_at DESC`
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** All classes that belong to a given school */
export async function getClassesForSchool(schoolId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} WHERE c.school_id = $1 ORDER BY c.created_at DESC`,
      [schoolId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** Classes taught by a teacher — only classes where they are the assigned teacher */
export async function getClassesForTeacher(teacherId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT}
       WHERE c.teacher_id = $1
       ORDER BY c.created_at DESC`,
      [teacherId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** All classes a student belongs to (multi-class capable) */
export async function getClassesForStudent(studentId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT}
       JOIN class_members cm ON cm.class_id = c.id
       WHERE cm.student_id = $1
       ORDER BY cm.joined_at, c.id`,
      [studentId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

/** Lookup a user's school_id directly from the DB */
export async function getSchoolForUser(userId: string): Promise<string | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT school_id FROM users WHERE id = $1`,
      [userId]
    )
    return result.rows.length > 0 ? (result.rows[0].school_id ?? null) : null
  } finally {
    client.release()
  }
}

/** Returns the school_id of a class, or null if the class has no school (or does not exist). */
export async function getClassSchoolId(classId: string): Promise<string | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT school_id FROM classes WHERE id = $1`,
      [classId]
    )
    return result.rows.length > 0 ? (result.rows[0].school_id ?? null) : null
  } finally {
    client.release()
  }
}

/** All users (of any role) belonging to a given school */
export async function getUsersInSchool(schoolId: string): Promise<UserWithRole[]> {
  await ensureSchoolSubscriptionTables()
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        u.school_id as "schoolId",
        s.name as "schoolName",
        u.school_access_ends_at as "schoolAccessEndsAt",
        COALESCE(u.school_manually_removed, FALSE) as "schoolManuallyRemoved",
        COALESCE(u.banned, FALSE) as "banned",
        us.settings->>'mode' as "billingMode",
        (
          EXISTS (
            SELECT 1 FROM subscriptions ps
            WHERE ps.user_id = u.id AND ps.status IN ('active', 'trialing')
          )
          OR EXISTS (
            SELECT 1 FROM school_subscriptions ss
            WHERE ss.school_id = u.school_id AND ss.status IN ('active', 'trialing')
          )
        ) as "hasActiveSubscription",
        (
          us.settings->>'mode' = 'local'
          AND (
            (us.settings->>'provider' = 'openai'
             AND COALESCE(us.settings->>'openAIApiKey', '') <> '')
            OR (us.settings->>'provider' = 'openaicompatible'
             AND COALESCE(us.settings->>'openaicompatibleApiKey', '') <> '')
          )
        ) as "hasMeterApiKey",
        (
          us.settings->>'mode' = 'proxy'
          AND COALESCE(us.settings->>'accessPassword', '') <> ''
        ) as "hasAccessPassword",
        ${CLASS_MEMBERSHIP_SELECT},
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       LEFT JOIN user_settings us ON u.id = us.user_id
       ${CLASS_MEMBERSHIP_JOIN}
       WHERE u.school_id = $1
       ORDER BY u."createdAt" DESC`,
      [schoolId]
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      schoolAccessEndsAt: row.schoolAccessEndsAt || null,
      schoolManuallyRemoved: row.schoolManuallyRemoved || false,
      billingMode: normalizeBillingMode(row.billingMode),
      hasActiveSubscription: !!row.hasActiveSubscription,
      hasMeterApiKey: !!row.hasMeterApiKey,
      hasAccessPassword: !!row.hasAccessPassword,
      banned: !!row.banned,
      classId: row.classId,
      className: row.className,
      classIds: row.classIds || [],
      classNames: row.classNames || [],
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

/**
 * Returns true if the teacher belongs to the same school as the class,
 * or if role is admin (admins bypass school scoping).
 */
export async function canAccessClass(userId: string, userRole: string, classId: string): Promise<boolean> {
  if (userRole === 'super-admin') return true
  if (userRole === 'admin') return true
  if (userRole !== 'teacher') return false

  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1
       FROM classes c
       JOIN users u ON u.id = $1
       WHERE c.id = $2
         AND c.school_id IS NOT NULL
         AND c.school_id = u.school_id`,
      [userId, classId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function getClassMembers(classId: string): Promise<ClassMember[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        cm.student_id, cm.joined_at,
        u.name as student_name, u.email as student_email, u.image as student_image
       FROM class_members cm
       JOIN users u ON cm.student_id = u.id
       WHERE cm.class_id = $1
         AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY cm.joined_at DESC`,
      [classId]
    )
    
    return result.rows.map(row => ({
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentImage: row.student_image,
      joinedAt: new Date(row.joined_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

/** Adds a membership. Additive (a student may belong to multiple classes); idempotent. */
export async function addStudentToClass(classId: string, studentId: string): Promise<boolean> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO class_members (class_id, student_id) VALUES ($1, $2)
       ON CONFLICT (class_id, student_id) DO UPDATE SET joined_at = NOW()`,
      [classId, studentId]
    )
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/** Removes the membership row for one (class, student) pair. */
export async function removeStudentFromClass(classId: string, studentId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      'DELETE FROM class_members WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/** Removes every class membership of a student. */
export async function removeStudentFromAllClasses(studentId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      'DELETE FROM class_members WHERE student_id = $1',
      [studentId]
    )
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/** All class ids a student belongs to (multi-class capable). */
export async function getStudentClassIds(studentId: string): Promise<string[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      'SELECT class_id FROM class_members WHERE student_id = $1 ORDER BY joined_at, class_id',
      [studentId]
    )
    return result.rows.map(row => row.class_id as string)
  } finally {
    client.release()
  }
}

/**
 * Legacy single-class accessor: the student's first class (earliest joined).
 * Prefer getStudentClassIds for new code.
 */
export async function getStudentClassId(studentId: string): Promise<string | null> {
  const classIds = await getStudentClassIds(studentId)
  return classIds.length > 0 ? classIds[0] : null
}

// Thin adapter: normalizes a snake_case DB row to the camelCase ProgressInput
// expected by the shared calculateProgress in @/utils/progress. The algorithm
// lives in ONE place (the util); this only renames fields. Used by all
// reading-session queries in this module (3 teacher-dashboard queries +
// getStudentSessionsForClass + getStudentSessions).
function calculateProgress(row: {
  extracted_text?: string | boolean
  pre_reading?: unknown
  student_prediction?: string
  summary?: string
  mind_map?: string
  visualization_generated_at?: number | string
  adapted_text?: string
  test_completed?: boolean
  analyzed_sentences?: Record<string, unknown>
  highlighted_words?: string[]
  glossary?: unknown[]
  collocations?: unknown[]
  spelling_game_best_score?: number
  vocabulary_quiz_score?: number
  grammar_quiz_completed?: boolean
  grammar_quiz_score?: number
  grammar_scramble_high_score?: number
  grammar_workshop_high_score?: number
  grammar_surgery_high_score?: number
  grammar_roulette_high_score?: number
  grammar_duel_high_score?: number
}): number {
  return sharedCalculateProgress({
    extractedText: row.extracted_text,
    preReading: row.pre_reading,
    studentPrediction: row.student_prediction,
    summary: row.summary,
    mindMap: row.mind_map,
    visualizationGeneratedAt: Number(row.visualization_generated_at ?? 0),
    adaptedText: row.adapted_text,
    analyzedSentences: row.analyzed_sentences,
    highlightedWords: row.highlighted_words,
    glossary: row.glossary,
    collocations: row.collocations,
    spellingGameBestScore: row.spelling_game_best_score,
    vocabularyQuizScore: row.vocabulary_quiz_score,
    testCompleted: row.test_completed,
    grammarScrambleHighScore: row.grammar_scramble_high_score,
    grammarWorkshopHighScore: row.grammar_workshop_high_score,
    grammarSurgeryHighScore: row.grammar_surgery_high_score,
    grammarRouletteHighScore: row.grammar_roulette_high_score,
    grammarDuelHighScore: row.grammar_duel_high_score,
    grammarQuizCompleted: row.grammar_quiz_completed,
    grammarQuizScore: row.grammar_quiz_score,
  })
}

export async function getStudentSessionsForClass(classId: string): Promise<StudentSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title, rs.student_age, rs.extracted_text, rs.summary,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        COALESCE(rs.tests_completed, 0) as tests_completed,
        COALESCE(rs.vocab_quizzes_completed, 0) as vocab_quizzes_completed,
        COALESCE(rs.spelling_games_completed, 0) as spelling_games_completed,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        COALESCE(rs.grammar_quizzes_completed, 0) as grammar_quizzes_completed,
        rs.grammar_scramble_high_score, rs.grammar_workshop_high_score,
        rs.grammar_surgery_high_score, rs.grammar_roulette_high_score, rs.grammar_duel_high_score,
        rs.grammar_game_accuracy,
        rs.spelling_game_accuracy,
        rs.pre_reading, rs.student_prediction, rs.collocations,
        rs.pre_reading IS NOT NULL as has_pre_reading,
        rs.pre_reading_generated_at,
        rs.collocations_generated_at,
        rs.glossary, rs.highlighted_words, rs.analyzed_sentences, rs.adapted_text, rs.mind_map,
        rs.visualization_generated_at,
        rs.created_at, rs.updated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN class_members cm ON rs.user_id = cm.student_id
       JOIN users u ON rs.user_id = u.id
       WHERE cm.class_id = $1
         AND COALESCE(u.banned, FALSE) = FALSE
       ORDER BY rs.updated_at DESC`,
      [classId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || row.extracted_text?.slice(0, 50) || 'Untitled',
      studentAge: row.student_age,
      summary: row.summary,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      spellingGameAccuracy: row.spelling_game_accuracy || 0,
      grammarQuizScore: row.grammar_quiz_score || 0,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarQuizzesCompleted: row.grammar_quizzes_completed ?? 0,
      grammarGameBestScore: Math.max(
        row.grammar_scramble_high_score || 0,
        row.grammar_workshop_high_score || 0,
        row.grammar_surgery_high_score || 0,
        row.grammar_roulette_high_score || 0,
        row.grammar_duel_high_score || 0,
      ),
      grammarGameAccuracy: row.grammar_game_accuracy || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function getStudentSessions(studentId: string): Promise<StudentSessionData[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        rs.id, rs.user_id, rs.doc_title, rs.student_age, rs.extracted_text, rs.summary,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        COALESCE(rs.tests_completed, 0) as tests_completed,
        COALESCE(rs.vocab_quizzes_completed, 0) as vocab_quizzes_completed,
        COALESCE(rs.spelling_games_completed, 0) as spelling_games_completed,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        COALESCE(rs.grammar_quizzes_completed, 0) as grammar_quizzes_completed,
        rs.grammar_scramble_high_score, rs.grammar_workshop_high_score,
        rs.grammar_surgery_high_score, rs.grammar_roulette_high_score, rs.grammar_duel_high_score,
        rs.grammar_game_accuracy,
        rs.spelling_game_accuracy,
        rs.pre_reading, rs.student_prediction, rs.collocations,
        rs.pre_reading IS NOT NULL as has_pre_reading,
        rs.pre_reading_generated_at,
        rs.collocations_generated_at,
        rs.glossary, rs.highlighted_words, rs.analyzed_sentences, rs.adapted_text, rs.mind_map,
        rs.visualization_generated_at,
        rs.created_at, rs.updated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       WHERE rs.user_id = $1
       ORDER BY rs.updated_at DESC`,
      [studentId]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || row.extracted_text?.slice(0, 50) || 'Untitled',
      studentAge: row.student_age,
      summary: row.summary,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      spellingGameAccuracy: row.spelling_game_accuracy || 0,
      grammarQuizScore: row.grammar_quiz_score || 0,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarQuizzesCompleted: row.grammar_quizzes_completed ?? 0,
      grammarGameBestScore: Math.max(
        row.grammar_scramble_high_score || 0,
        row.grammar_workshop_high_score || 0,
        row.grammar_surgery_high_score || 0,
        row.grammar_roulette_high_score || 0,
        row.grammar_duel_high_score || 0,
      ),
      grammarGameAccuracy: row.grammar_game_accuracy || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      progress: calculateProgress(row),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }))
  } finally {
    client.release()
  }
}

export async function canAccessStudent(userId: string, userRole: string, studentId: string): Promise<boolean> {
  if (userRole === 'super-admin') return true

  const client = await getClient()
  try {
    if (userRole === 'admin') {
      const result = await client.query(
        `SELECT 1 FROM users u1 JOIN users u2 ON u1.school_id = u2.school_id
         WHERE u1.id = $1 AND u2.id = $2 AND u1.school_id IS NOT NULL`,
        [userId, studentId]
      )
      return result.rows.length > 0
    }
    if (userRole === 'teacher') {
      const result = await client.query(
        `SELECT 1 FROM class_members cm
         JOIN classes c ON cm.class_id = c.id
         JOIN users u ON u.id = $1
         WHERE cm.student_id = $2 AND c.school_id = u.school_id AND c.school_id IS NOT NULL`,
        [userId, studentId]
      )
      return result.rows.length > 0
    }
    return false
  } finally {
    client.release()
  }
}

export async function getStudentSessionDetail(sessionId: string): Promise<StudentSessionData | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT
        rs.id, rs.user_id, rs.doc_title, rs.student_age, rs.extracted_text, rs.summary,
        rs.test_score, rs.test_completed, rs.vocabulary_quiz_score, rs.spelling_game_best_score,
        rs.spelling_game_accuracy,
        rs.grammar_quiz_score, rs.grammar_quiz_completed,
        rs.grammar_scramble_high_score, rs.grammar_workshop_high_score,
        rs.grammar_surgery_high_score, rs.grammar_roulette_high_score, rs.grammar_duel_high_score,
        rs.grammar_game_accuracy,
        rs.glossary, rs.highlighted_words, rs.analyzed_sentences, rs.adapted_text, rs.simplified_text,
        rs.vocabulary_quiz,
        rs.reading_test, rs.grammar_quiz,
        rs.created_at, rs.updated_at,
        u.name as user_name, u.email as user_email
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       WHERE rs.id = $1`,
      [sessionId]
    )
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      docTitle: row.doc_title || row.extracted_text?.slice(0, 50) || 'Untitled',
      studentAge: row.student_age,
      extractedText: row.extracted_text,
      summary: row.summary,
      testScore: row.test_score,
      testCompleted: row.test_completed,
      vocabularyQuizScore: row.vocabulary_quiz_score,
      spellingGameBestScore: row.spelling_game_best_score,
      spellingGameAccuracy: row.spelling_game_accuracy || 0,
      grammarQuizScore: row.grammar_quiz_score || 0,
      grammarQuizCompleted: !!row.grammar_quiz_completed,
      grammarGameBestScore: Math.max(
        row.grammar_scramble_high_score || 0,
        row.grammar_workshop_high_score || 0,
        row.grammar_surgery_high_score || 0,
        row.grammar_roulette_high_score || 0,
        row.grammar_duel_high_score || 0,
      ),
      grammarGameAccuracy: row.grammar_game_accuracy || 0,
      glossaryCount: Array.isArray(row.glossary) ? row.glossary.length : 0,
      glossary: Array.isArray(row.glossary) ? row.glossary : [],
      highlightedWords: Array.isArray(row.highlighted_words) ? row.highlighted_words : [],
      analyzedSentences: row.analyzed_sentences && typeof row.analyzed_sentences === "object" ? row.analyzed_sentences : {},
      adaptedText: row.adapted_text || undefined,
      simplifiedText: row.simplified_text || undefined,
      vocabularyQuiz: Array.isArray(row.vocabulary_quiz) ? row.vocabulary_quiz : [],
      readingTest: Array.isArray(row.reading_test) ? row.reading_test : [],
      grammarQuiz: Array.isArray(row.grammar_quiz) ? row.grammar_quiz : [],
      progress: 0,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }
  } finally {
    client.release()
  }
}

export async function getUsersForAdmin(adminSchoolId: string): Promise<UserWithRole[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 
        u.id, u.name, u.email, u.image, u."createdAt",
        COALESCE(ur.role, 'student') as role,
        u.school_id as "schoolId",
        s.name as "schoolName",
        ${CLASS_MEMBERSHIP_SELECT},
        (
          SELECT COALESCE(json_agg(c2.id), '[]'::json)
          FROM classes c2
          WHERE c2.teacher_id = u.id
        ) as "taughtClassIds",
        (
          SELECT COALESCE(json_agg(c3.name), '[]'::json)
          FROM classes c3
          WHERE c3.teacher_id = u.id
        ) as "taughtClassNames"
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       ${CLASS_MEMBERSHIP_JOIN}
       WHERE u.school_id = $1
       ORDER BY u."createdAt" DESC`,
      [adminSchoolId]
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role as UserRole,
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      classId: row.classId,
      className: row.className,
      classIds: row.classIds || [],
      classNames: row.classNames || [],
      taughtClassIds: row.taughtClassIds || [],
      taughtClassNames: row.taughtClassNames || [],
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : undefined,
    }))
  } finally {
    client.release()
  }
}

export async function getClassesForAdmin(adminSchoolId: string): Promise<ClassInfo[]> {
  const client = await getClient()
  try {
    const result = await client.query(
      `${CLASS_SELECT} WHERE c.school_id = $1 ORDER BY c.created_at DESC`,
      [adminSchoolId]
    )
    return result.rows.map(mapClassRow)
  } finally {
    client.release()
  }
}

export async function canManageUser(actorId: string, actorRole: string, targetUserId: string): Promise<boolean> {
  if (actorRole === 'super-admin') return true
  if (actorRole !== 'admin') return false
  
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM users u1, users u2 
       LEFT JOIN user_roles ur ON ur.user_id = u2.id
       WHERE u1.id = $1 AND u2.id = $2 
       AND u1.school_id = u2.school_id 
       AND u1.school_id IS NOT NULL
       AND ur.role NOT IN ('super-admin', 'admin')`,
      [actorId, targetUserId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function canManageClass(actorId: string, actorRole: string, classId: string): Promise<boolean> {
  if (actorRole === 'super-admin') return true
  if (actorRole !== 'admin') return false
  
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM classes c, users u 
       WHERE c.id = $1 AND u.id = $2 
       AND c.school_id = u.school_id 
       AND c.school_id IS NOT NULL`,
      [classId, actorId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

export async function isTeacherOfClass(teacherId: string, classId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
      [classId, teacherId]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

let schoolAccessEndsAtColumnEnsured = false

export async function ensureSchoolAccessEndsAtColumn(): Promise<void> {
  if (schoolAccessEndsAtColumnEnsured) return
  const client = await getClient()
  try {
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_access_ends_at TIMESTAMP WITH TIME ZONE`
    )
    schoolAccessEndsAtColumnEnsured = true
  } catch (error) {
    console.error("Failed to ensure school_access_ends_at column:", error)
  } finally {
    client.release()
  }
}

let schoolManuallyRemovedColumnEnsured = false

export async function ensureSchoolManuallyRemovedColumn(): Promise<void> {
  if (schoolManuallyRemovedColumnEnsured) return
  const client = await getClient()
  try {
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_manually_removed BOOLEAN DEFAULT FALSE`
    )
    schoolManuallyRemovedColumnEnsured = true
  } catch (error) {
    console.error("Failed to ensure school_manually_removed column:", error)
  } finally {
    client.release()
  }
}

export async function revokeSchoolAccessBulk(
  userIds: string[],
  graceDays: number = 2
): Promise<{ success: string[]; failed: string[] }> {
  await ensureSchoolAccessEndsAtColumn()
  const success: string[] = []
  const failed: string[] = []

  for (const userId of userIds) {
    const client = await getClient()
    try {
      const checkResult = await client.query(
        `SELECT school_id FROM users WHERE id = $1 AND school_id IS NOT NULL`,
        [userId]
      )
      if (checkResult.rows.length === 0) {
        failed.push(userId)
        continue
      }

      await client.query(
        `UPDATE users SET school_access_ends_at = NOW() + ($1 || ' days')::INTERVAL WHERE id = $2`,
        [graceDays, userId]
      )
      success.push(userId)
    } catch {
      failed.push(userId)
    } finally {
      client.release()
    }
  }

  return { success, failed }
}

export async function cleanupExpiredSchoolAccess(): Promise<number> {
  await ensureSchoolAccessEndsAtColumn()
  await ensureSchoolManuallyRemovedColumn()
  const client = await getClient()
  try {
    const userResult = await client.query(
      `SELECT id, school_id FROM users
       WHERE school_access_ends_at IS NOT NULL
         AND school_access_ends_at < NOW()
         AND school_id IS NOT NULL`
    )

    if (userResult.rows.length === 0) return 0

    const userIds = userResult.rows.map((r) => r.id)

    await client.query(
      `DELETE FROM class_members
       WHERE student_id = ANY($1)`,
      [userIds]
    )

    await client.query(
      `DELETE FROM school_subscription_usage
       WHERE user_id = ANY($1)`,
      [userIds]
    )

    const result = await client.query(
      `UPDATE users
       SET school_id = NULL, school_access_ends_at = NULL, school_manually_removed = TRUE
       WHERE id = ANY($1)`,
      [userIds]
    )
    return result.rowCount ?? 0
  } catch (error) {
    console.error("Failed to cleanup expired school access:", error)
    return 0
  } finally {
    client.release()
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  const client = await getClient()
  try {
    const result = await client.query(
      `DELETE FROM users WHERE id = $1`,
      [userId]
    )
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error("Failed to delete user:", error)
    return false
  } finally {
    client.release()
  }
}

export interface ScopedStudentClass {
  id: string
  name: string
  teacherId: string | null
  teacherName: string | null
}

export interface ScopedStudent {
  id: string
  name: string | null
  email: string | null
  /** First class (earliest joined) — legacy compat; prefer classes[] */
  classId: string | null
  className: string | null
  teacherId: string | null
  teacherName: string | null
  /** All classes the student belongs to (multi-class capable) */
  classes: ScopedStudentClass[]
  schoolId: string | null
  schoolName: string | null
}

/**
 * Stricter than canAccessStudent for the vocabulary student view:
 * teachers may only view students in classes they teach (not the whole school).
 */
export async function canViewStudentVocabulary(actorId: string, actorRole: string, studentId: string): Promise<boolean> {
  if (actorRole === 'super-admin') return true

  const client = await getClient()
  try {
    if (actorRole === 'admin') {
      const result = await client.query(
        `SELECT 1 FROM users u1 JOIN users u2 ON u1.school_id = u2.school_id
         WHERE u1.id = $1 AND u2.id = $2 AND u1.school_id IS NOT NULL`,
        [actorId, studentId]
      )
      return result.rows.length > 0
    }
    if (actorRole === 'teacher') {
      const result = await client.query(
        `SELECT 1 FROM class_members cm
         JOIN classes c ON cm.class_id = c.id
         WHERE cm.student_id = $2 AND c.teacher_id = $1`,
        [actorId, studentId]
      )
      return result.rows.length > 0
    }
    return false
  } finally {
    client.release()
  }
}

/**
 * Students whose vocabulary the actor may view:
 * - teacher: students in classes they teach
 * - admin: all students in their school (class info included, may be null)
 * - super-admin: all students, optionally narrowed to one school
 */
export async function getScopedStudents(actorId: string, actorRole: string, schoolId?: string): Promise<ScopedStudent[]> {
  const client = await getClient()
  try {
    const params: unknown[] = [actorId]
    let outerScope = ''
    let innerClassScope = ''
    let requiresScopedClass = ''
    if (actorRole === 'teacher') {
      // Only aggregate the teacher's own classes and only return students
      // that have at least one membership in them.
      innerClassScope = 'AND c.teacher_id = $1'
      requiresScopedClass = "AND cls.classes <> '[]'::json"
    } else if (actorRole === 'admin') {
      outerScope = 'AND u.school_id IS NOT NULL AND u.school_id = (SELECT school_id FROM users WHERE id = $1)'
    } else if (actorRole === 'super-admin') {
      if (schoolId) {
        params.push(schoolId)
        outerScope = 'AND u.school_id = $2'
      }
    } else {
      return []
    }

    const result = await client.query(
      `SELECT u.id, u.name, u.email,
              cls.classes AS classes,
              sch.id AS school_id, sch.name AS school_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT COALESCE(json_agg(json_build_object(
                  'id', c.id,
                  'name', c.name,
                  'teacherId', t.id,
                  'teacherName', t.name
                ) ORDER BY cm.joined_at, c.id), '[]'::json) AS classes
         FROM class_members cm
         JOIN classes c ON c.id = cm.class_id
         LEFT JOIN users t ON t.id = c.teacher_id
         WHERE cm.student_id = u.id ${innerClassScope}
       ) cls ON TRUE
       LEFT JOIN schools sch ON sch.id = u.school_id
       WHERE COALESCE(ur.role, 'student') = 'student'
         AND u.id <> $1
         AND COALESCE(u.banned, FALSE) = FALSE
         ${outerScope}
         ${requiresScopedClass}
       ORDER BY u.name ASC`,
      params
    )
    return result.rows.map((row: Record<string, unknown>) => {
      const classes = (row.classes as ScopedStudentClass[]) || []
      const first = classes.length > 0 ? classes[0] : null
      return {
        id: (row.id as string) ?? '',
        name: (row.name as string) ?? null,
        email: (row.email as string) ?? null,
        classId: first?.id ?? null,
        className: first?.name ?? null,
        teacherId: first?.teacherId ?? null,
        teacherName: first?.teacherName ?? null,
        classes,
        schoolId: (row.school_id as string) ?? null,
        schoolName: (row.school_name as string) ?? null,
      }
    })
  } catch (error) {
    console.error('Failed to get scoped students:', error)
    return []
  } finally {
    client.release()
  }
}

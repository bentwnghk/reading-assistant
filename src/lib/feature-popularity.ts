import { getClient } from "./db"

/**
 * Feature Popularity (User Management → Feature Popularity tab).
 *
 * Aggregates how often each product feature is used, split by Students vs
 * Teachers, with optional school / class / date-range scoping.
 *
 * Data sources (best available signal per feature, mirroring the Learning
 * Journey Overview charts):
 * - reading_sessions columns + *_generated_at timestamps (most AI features)
 * - vocabulary_review_sessions by mode (flashcard / quiz / spelling)
 * - chat_questions (AI Tutor — one row per question asked)
 * - activity_logs 'tts_playback' (Read Along / TTS — logged from utils/tts.ts;
 *   no historical data exists before the activity type was introduced)
 */
export const FEATURE_POPULARITY_KEYS = [
  "beforeYouRead",
  "summary",
  "mindMap",
  "visualization",
  "adaptText",
  "simplifyText",
  "sentenceAnalysis",
  "glossary",
  "collocations",
  "flashcardReview",
  "spellingGame",
  "vocabQuiz",
  "readingTest",
  "grammarAnalysis",
  "grammarGame",
  "grammarQuiz",
  "aiTutor",
  "ttsPlayback",
] as const

export type FeaturePopularityKey = (typeof FEATURE_POPULARITY_KEYS)[number]

export interface FeatureUsage {
  /** Total number of uses (events / sessions where the feature ran). */
  uses: number
  /** Distinct users who used the feature at least once. */
  users: number
}

export interface FeaturePopularityEntry {
  feature: FeaturePopularityKey
  students: FeatureUsage
  teachers: FeatureUsage
}

export interface FeaturePopularityOptions {
  schoolId?: string
  classId?: string
  startDate?: Date
}

type RoleBucket = "student" | "teacher" | "other"

/**
 * Buckets users into student / teacher / other. The role lives in user_roles
 * (missing row = student, mirroring getUserRole's default).
 */
const ROLE_BUCKET_SQL = `CASE COALESCE(ur.role, 'student')
  WHEN 'student' THEN 'student'
  WHEN 'teacher' THEN 'teacher'
  ELSE 'other' END`

interface Scope {
  /** SQL fragment (references aliases `u` / `ur`) restricting the user set. */
  whereSql: string
  /** Positional params, appended AFTER the query's own date params. */
  params: unknown[]
}

/**
 * Shared user scope: school filter (everyone) + class filter (students only —
 * teachers are not class members, so a selected class constrains the student
 * series while the teacher series keeps the school's teachers).
 *
 * `base` is the number of positional params the calling query has already
 * pushed, so scope placeholders start at $${base + 1}.
 */
function buildScope(options: FeaturePopularityOptions, base: number): Scope {
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.schoolId) {
    conditions.push(`u.school_id = $${base + params.length + 1}`)
    params.push(options.schoolId)
  }

  if (options.classId) {
    conditions.push(`(
      COALESCE(ur.role, 'student') <> 'student'
      OR EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.student_id = u.id AND cm.class_id = $${base + params.length + 1}
      )
    )`)
    params.push(options.classId)
  }

  return {
    whereSql: conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "",
    params,
  }
}

function emptyUsage(): FeatureUsage {
  return { uses: 0, users: 0 }
}

function toBucket(role: unknown): RoleBucket {
  return role === "teacher" ? "teacher" : role === "student" ? "student" : "other"
}

/**
 * Timestamp filter for BIGINT-ms columns (e.g. summary_generated_at).
 * Falls back to the row's created_at for legacy rows where the feature
 * timestamp is 0/NULL (mirrors the dashboard metrics fallback).
 * Returns "TRUE" when no date filter is requested.
 */
function msDateCond(column: string, createdCol: string, startMs: number | null, idx: number): string {
  if (startMs === null) return "TRUE"
  return `COALESCE(NULLIF(${column}, 0), (extract(epoch FROM ${createdCol}) * 1000)::bigint) >= $${idx}`
}

/**
 * Timestamp filter for TIMESTAMP WITH TIME ZONE columns (e.g.
 * grammar_game_completed_at, chat_questions.created_at).
 */
function tsDateCond(column: string, createdCol: string, startDate: Date | null, idx: number): string {
  if (!startDate) return "TRUE"
  return `COALESCE(${column}, ${createdCol}) >= $${idx}`
}

export async function getFeaturePopularity(
  options: FeaturePopularityOptions = {}
): Promise<FeaturePopularityEntry[]> {
  const client = await getClient()
  try {
    const startMs = options.startDate ? options.startDate.getTime() : null
    const startDate = options.startDate ?? null

    const result = Object.fromEntries(
      FEATURE_POPULARITY_KEYS.map((f) => [
        f,
        { feature: f, students: emptyUsage(), teachers: emptyUsage() },
      ])
    ) as Record<FeaturePopularityKey, FeaturePopularityEntry>

    const add = (
      feature: FeaturePopularityKey,
      bucket: RoleBucket,
      uses: number,
      users: number
    ) => {
      if (bucket === "other") return
      const target = bucket === "teacher" ? result[feature].teachers : result[feature].students
      target.uses += uses
      target.users += users
    }

    // ── Query 1: reading_sessions features ──────────────────────────────────
    {
      const params: unknown[] = []
      let i = 1
      const msIdx = startMs !== null ? (params.push(startMs), i++) : -1
      const tsIdx = startDate ? (params.push(startDate), i++) : -1
      const scope = buildScope(options, params.length)

      const selects: string[] = []
      const pushPresence = (key: FeaturePopularityKey, cond: string, tsCol: string) => {
        const ts = msDateCond(`rs.${tsCol}`, "rs.created_at", startMs, msIdx)
        selects.push(
          `COUNT(*) FILTER (WHERE ${cond} AND ${ts}) AS ${key}_uses`,
          `COUNT(DISTINCT rs.user_id) FILTER (WHERE ${cond} AND ${ts}) AS ${key}_users`
        )
      }

      pushPresence("beforeYouRead", "rs.pre_reading IS NOT NULL", "pre_reading_generated_at")
      pushPresence("summary", "rs.summary IS NOT NULL AND rs.summary <> ''", "summary_generated_at")
      pushPresence("mindMap", "rs.mind_map IS NOT NULL AND rs.mind_map <> ''", "mind_map_generated_at")
      pushPresence("visualization", "rs.visualization_generated_at > 0", "visualization_generated_at")
      pushPresence("adaptText", "rs.adapted_text IS NOT NULL AND rs.adapted_text <> ''", "adapted_text_generated_at")
      pushPresence("simplifyText", "rs.simplified_text IS NOT NULL AND rs.simplified_text <> ''", "simplified_text_generated_at")
      pushPresence("glossary", "rs.glossary IS NOT NULL AND rs.glossary <> '[]'::jsonb", "glossary_generated_at")
      pushPresence("collocations", "rs.collocations IS NOT NULL AND rs.collocations <> '[]'::jsonb", "collocations_generated_at")
      pushPresence("grammarAnalysis", "rs.grammar_topics IS NOT NULL AND rs.grammar_topics <> '[]'::jsonb", "grammar_generated_at")

      // Counter features — uses follow the dashboard pattern
      // (`counter || 1` once the completion flag is set), users = distinct
      // users with the flag set.
      const readingTestTs = msDateCond("rs.reading_test_completed_at", "rs.created_at", startMs, msIdx)
      const readingTestCond = `rs.test_completed AND ${readingTestTs}`
      selects.push(
        `SUM(CASE WHEN ${readingTestCond} THEN GREATEST(COALESCE(rs.tests_completed, 0), 1) ELSE 0 END) AS readingTest_uses`,
        `COUNT(DISTINCT rs.user_id) FILTER (WHERE ${readingTestCond}) AS readingTest_users`
      )

      const grammarQuizTs = msDateCond("rs.grammar_quiz_completed_at", "rs.created_at", startMs, msIdx)
      const grammarQuizCond = `rs.grammar_quiz_completed AND ${grammarQuizTs}`
      selects.push(
        `SUM(CASE WHEN ${grammarQuizCond} THEN GREATEST(COALESCE(rs.grammar_quizzes_completed, 0), 1) ELSE 0 END) AS grammarQuiz_uses`,
        `COUNT(DISTINCT rs.user_id) FILTER (WHERE ${grammarQuizCond}) AS grammarQuiz_users`
      )

      // grammar_game_completed_at is TIMESTAMPTZ (not BIGINT like the others)
      const grammarGameTs = tsDateCond("rs.grammar_game_completed_at", "rs.created_at", startDate, tsIdx)
      const grammarGameCond = `(COALESCE(rs.grammar_games_completed, 0) > 0 OR rs.grammar_game_completed_at IS NOT NULL) AND ${grammarGameTs}`
      selects.push(
        `SUM(CASE WHEN ${grammarGameCond} THEN GREATEST(COALESCE(rs.grammar_games_completed, 0), 1) ELSE 0 END) AS grammarGame_uses`,
        `COUNT(DISTINCT rs.user_id) FILTER (WHERE ${grammarGameCond}) AS grammarGame_users`
      )

      const rows = await client.query(
        `SELECT ${ROLE_BUCKET_SQL} AS role_bucket, ${selects.join(", ")}
         FROM reading_sessions rs
         JOIN users u ON rs.user_id = u.id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         WHERE TRUE${scope.whereSql}
         GROUP BY role_bucket`,
        [...params, ...scope.params]
      )

      for (const row of rows.rows) {
        const bucket = toBucket(row.role_bucket)
        for (const key of FEATURE_POPULARITY_KEYS) {
          add(key, bucket, Number(row[`${key}_uses`] ?? 0), Number(row[`${key}_users`] ?? 0))
        }
      }
    }

    // Queries 2–5 share the same shape: one feature, one date param.
    const runSingleFeatureQuery = async (args: {
      feature: FeaturePopularityKey
      /** FROM clause; must expose `u` and `ur` joins for scope + bucketing. */
      fromSql: string
      /** Column holding the user id (for COUNT(DISTINCT ...)). */
      userCol: string
      /** WHERE conditions (may be empty); date condition references $1. */
      conds: string[]
      /** Date param (BIGINT ms or Date) — empty array means no date filter. */
      dateParams: unknown[]
    }) => {
      const { feature, fromSql, userCol, conds, dateParams } = args
      const scope = buildScope(options, dateParams.length)
      const whereSql = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : ""
      const rows = await client.query(
        `SELECT ${ROLE_BUCKET_SQL} AS role_bucket,
                COUNT(*) AS uses,
                COUNT(DISTINCT ${userCol}) AS users
         FROM ${fromSql}
         ${whereSql}${scope.whereSql}
         GROUP BY role_bucket`,
        [...dateParams, ...scope.params]
      )
      for (const row of rows.rows) {
        add(feature, toBucket(row.role_bucket), Number(row.uses), Number(row.users))
      }
    }

    const USER_JOINS = `JOIN users u ON {userCol} = u.id
         LEFT JOIN user_roles ur ON ur.user_id = u.id`

    // ── Query 2: sentence analysis entries (jsonb_each) ─────────────────────
    {
      const entryTs =
        startMs === null
          ? "TRUE"
          : `COALESCE(
              CASE WHEN e.value->>'createdAt' ~ '^[0-9]+$' THEN (e.value->>'createdAt')::bigint END,
              (extract(epoch FROM rs.created_at) * 1000)::bigint
            ) >= $1`

      await runSingleFeatureQuery({
        feature: "sentenceAnalysis",
        fromSql: `reading_sessions rs
         JOIN LATERAL jsonb_each(rs.analyzed_sentences) e ON TRUE
         ${USER_JOINS.replace("{userCol}", "rs.user_id")}`,
        userCol: "rs.user_id",
        conds: [
          "rs.analyzed_sentences IS NOT NULL",
          "rs.analyzed_sentences <> '{}'::jsonb",
          entryTs,
        ],
        dateParams: startMs !== null ? [startMs] : [],
      })
    }

    // ── Query 3: vocabulary review sessions (flashcard / quiz / spelling) ───
    {
      const dateCond = startMs === null ? "TRUE" : "COALESCE(NULLIF(vrs.completed_at, 0), 0) >= $1"
      const scope = buildScope(options, startMs !== null ? 1 : 0)
      const rows = await client.query(
        `SELECT ${ROLE_BUCKET_SQL} AS role_bucket,
                vrs.mode AS mode,
                COUNT(*) AS uses,
                COUNT(DISTINCT vrs.user_id) AS users
         FROM vocabulary_review_sessions vrs
         JOIN users u ON vrs.user_id = u.id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         WHERE ${dateCond}${scope.whereSql}
         GROUP BY role_bucket, vrs.mode`,
        [...(startMs !== null ? [startMs] : []), ...scope.params]
      )

      const modeFeature: Record<string, FeaturePopularityKey> = {
        flashcard: "flashcardReview",
        quiz: "vocabQuiz",
        spelling: "spellingGame",
      }
      for (const row of rows.rows) {
        const feature = modeFeature[row.mode as string]
        if (feature) add(feature, toBucket(row.role_bucket), Number(row.uses), Number(row.users))
      }
    }

    // ── Query 4: AI Tutor (chat_questions) ──────────────────────────────────
    {
      const dateCond = tsDateCond("cq.created_at", "cq.created_at", startDate, 1)
      await runSingleFeatureQuery({
        feature: "aiTutor",
        fromSql: `chat_questions cq
         ${USER_JOINS.replace("{userCol}", "cq.user_id")}`,
        userCol: "cq.user_id",
        conds: dateCond === "TRUE" ? [] : [dateCond],
        dateParams: startDate ? [startDate] : [],
      })
    }

    // ── Query 5: Read Along / TTS playback (activity_logs) ──────────────────
    {
      const dateCond = tsDateCond("al.created_at", "al.created_at", startDate, 1)
      await runSingleFeatureQuery({
        feature: "ttsPlayback",
        fromSql: `activity_logs al
         ${USER_JOINS.replace("{userCol}", "al.user_id")}`,
        userCol: "al.user_id",
        conds: ["al.activity_type = 'tts_playback'", ...(dateCond === "TRUE" ? [] : [dateCond])],
        dateParams: startDate ? [startDate] : [],
      })
    }

    return FEATURE_POPULARITY_KEYS.map((key) => result[key])
  } finally {
    client.release()
  }
}

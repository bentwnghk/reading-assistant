import { getPool } from "./db";
import {
  VOCABULARY_MASTERED_LEVEL,
  type VocabularyActivityEventType,
} from "@/constants/vocabularyActivity";
import type { LanguageCheckStaffScope } from "./language-check";
import type {
  VocabularyActivityRow,
  VocabularyAnalyticsData,
  VocabularyAnalyticsTotals,
  VocabularyHardWord,
  VocabularyModeStat,
  VocabularySeriesPoint,
  VocabularySessionPoint,
  VocabularySnapshot,
  VocabularyStaffSessionRow,
  VocabularyStudentRow,
} from "@/utils/vocabularyAnalyticsWire";

interface LogInput {
  userId: string;
  type: VocabularyActivityEventType;
  entryType?: "word" | "phrase" | null;
  word?: string | null;
  details?: Record<string, unknown>;
  /** Idempotency key: a replay with the same key inserts nothing. */
  eventKey?: string;
}

/**
 * Appends one event to the vocabulary activity ledger. Fire-and-forget by
 * design: analytics must never fail (or slow down) the learner's own action,
 * so errors are logged and swallowed.
 */
export async function logVocabularyActivity(input: LogInput): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO vocabulary_activity_events (user_id, type, entry_type, word, details, event_key)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING`,
      [
        input.userId,
        input.type,
        input.entryType ?? null,
        input.word ?? null,
        JSON.stringify(input.details ?? {}),
        input.eventKey ?? null,
      ]
    );
  } catch (error) {
    console.error("Failed to log vocabulary activity:", error);
  }
}

// ─── Staff analytics ─────────────────────────────────────────────────────────

type Row = Record<string, unknown>;
type Mode = "flashcard" | "quiz" | "spelling";

export interface AnalyticsFilters {
  /** Days back from now; 0 = all time. */
  range: number;
  userId?: string;
  classId?: string;
  /** "My Classes" — students of the classes this teacher owns. */
  mineTeacherId?: string;
}

const num = (v: unknown): number => Number(v) || 0;
const pct = (correct: unknown, total: unknown): number | null => {
  const t = num(total);
  return t > 0 ? Math.round((num(correct) / t) * 100) : null;
};
const round0 = (v: unknown): number | null =>
  v === null || v === undefined ? null : Math.round(Number(v));

/** Validates an IANA zone name; anything else falls back to UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

class Params {
  values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/**
 * CTE `sc` = the students the staff member may see: role-scoped (teacher →
 * students in their classes, admin → their school, super-admin → everyone),
 * optionally narrowed by class ("My Classes" via `mineTeacherId`) and student.
 * Banned users and staff accounts never appear.
 */
function scopeCte(
  p: Params,
  scope: LanguageCheckStaffScope,
  f: { classId?: string; mineTeacherId?: string; userId?: string }
): string {
  const clauses = [
    `COALESCE(ur.role, 'student') = 'student'`,
    `COALESCE(u.banned, FALSE) = FALSE`,
  ];
  if (scope.kind === "teacher") {
    clauses.push(
      `EXISTS (SELECT 1 FROM class_members scm JOIN classes sc2 ON sc2.id = scm.class_id
               WHERE scm.student_id = u.id AND sc2.teacher_id = ${p.add(scope.teacherId)})`
    );
  } else if (scope.kind === "school") {
    clauses.push(`u.school_id = ${p.add(scope.schoolId)}`);
  }
  if (f.classId) {
    clauses.push(
      `u.id IN (SELECT student_id FROM class_members WHERE class_id = ${p.add(f.classId)})`
    );
  }
  if (f.mineTeacherId) {
    clauses.push(
      `u.id IN (
         SELECT mcm.student_id FROM class_members mcm
         JOIN classes mc ON mc.id = mcm.class_id
         WHERE mc.teacher_id = ${p.add(f.mineTeacherId)}
       )`
    );
  }
  if (f.userId) clauses.push(`u.id = ${p.add(f.userId)}`);
  return `sc AS (
    SELECT u.id, u.name, u.email FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    WHERE ${clauses.join(" AND ")}
  )`;
}

const cutoffMs = (range: number): number =>
  range > 0 ? Date.now() - range * 86_400_000 : 0;

/** How many "most missed words" the dashboard returns (paged client-side). */
const HARD_WORDS_LIMIT = 100;

/** Students the filter bar offers: scope + class only (never narrowed by student). */
export async function listAnalyticsStudents(
  scope: LanguageCheckStaffScope,
  opts: { classId?: string; mineTeacherId?: string }
): Promise<{ id: string; name: string; email: string }[]> {
  const p = new Params();
  const cte = scopeCte(p, scope, { classId: opts.classId, mineTeacherId: opts.mineTeacherId });
  const res = await getPool().query(
    `WITH ${cte}
     SELECT id, name, email FROM sc ORDER BY name, email LIMIT 1000`,
    p.values
  );
  return res.rows.map((r: Row) => ({
    id: r.id as string,
    name: (r.name as string) || (r.email as string) || "",
    email: (r.email as string) || "",
  }));
}

export async function getVocabularyAnalytics(
  scope: LanguageCheckStaffScope,
  opts: AnalyticsFilters & { timeZone: string; page: number; pageSize: number; selfOnly?: boolean }
): Promise<VocabularyAnalyticsData> {
  const tz = safeTimeZone(opts.timeZone);
  const bucketUnit: "day" | "week" =
    opts.range > 0 && opts.range <= 30 ? "day" : "week";
  const since = cutoffMs(opts.range);
  const now = Date.now();
  const pool = getPool();

  // Each query gets its own parameter list, starting with the same scope CTE.
  const q = (build: (p: Params, sc: string) => string, withUser = true) => {
    const p = new Params();
    const cte = scopeCte(p, scope, {
      classId: opts.classId,
      mineTeacherId: opts.mineTeacherId,
      userId: withUser ? opts.userId : undefined,
    });
    const sql = build(p, cte);
    return pool.query(sql, p.values);
  };

  const sessWhere = (p: Params) => `s.completed_at >= ${p.add(since)}`;

  const modesQ = q(
    (p, sc) => `WITH ${sc}
      SELECT s.mode, COUNT(*)::int AS sessions,
             COALESCE(SUM(s.total_words), 0)::int AS reviewed,
             COALESCE(SUM(s.correct_count), 0)::int AS correct
      FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
      WHERE ${sessWhere(p)}
      GROUP BY s.mode`
  );

  const activityQ = q((p, sc) => {
    const ts = p.add(tz);
    const sinceA = p.add(since);
    const sinceB = p.add(since);
    return `WITH ${sc}
      SELECT COUNT(DISTINCT d)::int AS active_days,
             COUNT(DISTINCT user_id)::int AS learners,
             MAX(ms) AS last_active,
             COALESCE(SUM(added), 0)::int AS added
      FROM (
        SELECT s.user_id, (to_timestamp(s.completed_at / 1000.0) AT TIME ZONE ${ts})::date AS d,
               s.completed_at AS ms, 0 AS added
        FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
        WHERE s.completed_at >= ${sinceA}
        UNION ALL
        SELECT e.user_id, (e.created_at AT TIME ZONE ${ts})::date,
               (EXTRACT(EPOCH FROM e.created_at) * 1000)::bigint,
               COALESCE((e.details->>'count')::int, 1)
        FROM vocabulary_activity_events e JOIN sc ON sc.id = e.user_id
        WHERE e.type = 'words_added'
          AND (EXTRACT(EPOCH FROM e.created_at) * 1000) >= ${sinceB}
      ) x`;
  });

  const snapshotQ = q((p, sc) => {
    const n = p.add(now);
    const mastered = p.add(VOCABULARY_MASTERED_LEVEL);
    return `WITH ${sc}
      SELECT COUNT(DISTINCT v.user_id)::int AS learners,
             COUNT(*) FILTER (WHERE v.entry_type = 'word')::int AS words,
             COUNT(*) FILTER (WHERE v.entry_type = 'phrase')::int AS phrases,
             COUNT(*) FILTER (WHERE v.mastery_level >= ${mastered})::int AS mastered,
             COUNT(*) FILTER (WHERE v.mastery_level = 0 AND v.review_count = 0)::int AS new_entries,
             COUNT(*) FILTER (WHERE v.next_review_at <= ${n})::int AS due,
             COUNT(*) FILTER (WHERE v.rating = 'hard')::int AS hard,
             AVG(v.mastery_level) AS avg_mastery,
             ${[0, 1, 2, 3, 4, 5]
               .map((l) => `COUNT(*) FILTER (WHERE v.mastery_level = ${l})::int AS l${l}`)
               .join(", ")}
      FROM user_vocabulary v JOIN sc ON sc.id = v.user_id
      WHERE v.hidden_at = 0`;
  });

  const seriesQ = q((p, sc) => {
    const sinceA = p.add(since);
    const sinceB = p.add(since);
    const ts = p.add(tz);
    const unit = p.add(bucketUnit);
    return `WITH ${sc},
      x AS (
        SELECT to_timestamp(s.completed_at / 1000.0) AS at, 1 AS sessions,
               s.total_words AS reviewed, s.correct_count AS correct, 0 AS added
        FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
        WHERE s.completed_at >= ${sinceA}
        UNION ALL
        SELECT e.created_at, 0, 0, 0, COALESCE((e.details->>'count')::int, 1)
        FROM vocabulary_activity_events e JOIN sc ON sc.id = e.user_id
        WHERE e.type = 'words_added'
          AND (EXTRACT(EPOCH FROM e.created_at) * 1000) >= ${sinceB}
      )
      SELECT to_char(date_trunc(${unit}, at AT TIME ZONE ${ts}), 'YYYY-MM-DD') AS bucket,
             SUM(sessions)::int AS sessions, SUM(reviewed)::int AS reviewed,
             SUM(correct)::int AS correct, SUM(added)::int AS added
      FROM x GROUP BY 1 ORDER BY 1`;
  });

  // Definitions are resolved ONLY for the aggregated hard words (never per
  // review-result row — a lateral in the aggregate would re-execute for
  // every row and there is no word-leading index on user_vocabulary, which
  // made super-admin dashboards take seconds). One DISTINCT ON pass picks
  // the richest in-scope bank row per word.
  const hardQ = q(
    (p, sc) => `WITH ${sc},
      hard AS (
        SELECT r.word, COUNT(*)::int AS attempts,
               COUNT(*) FILTER (WHERE NOT r.correct)::int AS wrong,
               COUNT(DISTINCT s.user_id) FILTER (WHERE NOT r.correct)::int AS learners
        FROM vocabulary_review_results r
        JOIN vocabulary_review_sessions s ON s.id = r.session_id
        JOIN sc ON sc.id = s.user_id
        WHERE ${sessWhere(p)}
        GROUP BY r.word
        HAVING COUNT(*) FILTER (WHERE NOT r.correct) > 0
        ORDER BY wrong DESC, attempts DESC, r.word
        LIMIT ${HARD_WORDS_LIMIT}
      ),
      defs AS (
        SELECT DISTINCT ON (uv.word) uv.word, uv.syllabification, uv.part_of_speech,
               uv.english_definition, uv.chinese_definition, uv.example, uv.entry_type
        FROM user_vocabulary uv
        JOIN sc bank ON bank.id = uv.user_id
        WHERE uv.hidden_at = 0 AND uv.word IN (SELECT word FROM hard)
        ORDER BY uv.word,
                 length(uv.english_definition) + length(uv.chinese_definition)
                 + length(uv.example) DESC, uv.updated_at DESC
      )
      SELECT h.word, h.attempts, h.wrong, h.learners,
             d.syllabification, d.part_of_speech, d.english_definition,
             d.chinese_definition, d.example, d.entry_type
      FROM hard h
      LEFT JOIN defs d ON d.word = h.word
      ORDER BY h.wrong DESC, h.attempts DESC, h.word`
  );

  const singleLearner = !!opts.userId;
  const historyQ = singleLearner
    ? q(
        (p, sc) => `WITH ${sc}
          SELECT s.completed_at, s.mode, s.accuracy, s.total_words
          FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
          WHERE ${sessWhere(p)}
          ORDER BY s.completed_at DESC LIMIT 300`
      )
    : Promise.resolve({ rows: [] as Row[] });

  const perStudentQuery = (p: Params, sc: string): string => {
    const n = p.add(now);
    const mastered = p.add(VOCABULARY_MASTERED_LEVEL);
    const sinceS = p.add(since);
    const limit = p.add(opts.pageSize);
    const offset = p.add((opts.page - 1) * opts.pageSize);
    return `WITH ${sc},
      vocab AS (
        SELECT user_id,
               COUNT(*) FILTER (WHERE entry_type = 'word')::int AS words,
               COUNT(*) FILTER (WHERE entry_type = 'phrase')::int AS phrases,
               COUNT(*) FILTER (WHERE mastery_level >= ${mastered})::int AS mastered,
               COUNT(*) FILTER (WHERE next_review_at <= ${n})::int AS due,
               COUNT(*) FILTER (WHERE rating = 'hard')::int AS hard,
               AVG(mastery_level) AS avg_mastery
        FROM user_vocabulary WHERE hidden_at = 0 GROUP BY user_id
      ),
      ranked AS (
        SELECT s.user_id, s.total_words, s.correct_count, s.accuracy, s.completed_at,
               ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.completed_at) AS rn,
               COUNT(*) OVER (PARTITION BY s.user_id) AS cnt
        FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
        WHERE s.completed_at >= ${sinceS}
      ),
      sess AS (
        SELECT user_id, COUNT(*)::int AS sessions,
               SUM(total_words)::int AS reviewed, SUM(correct_count)::int AS correct,
               MAX(completed_at) AS last_active,
               AVG(accuracy) FILTER (WHERE cnt >= 2 AND rn > cnt - cnt / 2) AS late_acc,
               AVG(accuracy) FILTER (WHERE cnt >= 2 AND rn <= cnt / 2) AS early_acc
        FROM ranked GROUP BY user_id
      ),
      added AS (
        SELECT user_id, (EXTRACT(EPOCH FROM MAX(created_at)) * 1000)::bigint AS last_added
        FROM vocabulary_activity_events WHERE type = 'words_added' GROUP BY user_id
      )
      SELECT sc.id, sc.name, sc.email,
             COALESCE(v.words, 0) AS words, COALESCE(v.phrases, 0) AS phrases,
             COALESCE(v.mastered, 0) AS mastered, COALESCE(v.due, 0) AS due,
             COALESCE(v.hard, 0) AS hard, v.avg_mastery,
             COALESCE(s.sessions, 0) AS sessions, COALESCE(s.reviewed, 0) AS reviewed,
             COALESCE(s.correct, 0) AS correct, s.late_acc, s.early_acc,
             GREATEST(s.last_active, a.last_added) AS last_active,
             COUNT(*) OVER () AS total
      FROM sc
      LEFT JOIN vocab v ON v.user_id = sc.id
      LEFT JOIN sess s ON s.user_id = sc.id
      LEFT JOIN added a ON a.user_id = sc.id
      ORDER BY GREATEST(s.last_active, a.last_added) DESC NULLS LAST, sc.name, sc.id
      LIMIT ${limit} OFFSET ${offset}`;
  };
  // selfOnly (the learner's own "My analytics" view) needs neither the
  // per-student table nor the filter-bar user list.
  const studentsQ = opts.selfOnly
    ? Promise.resolve({ rows: [] as Row[] })
    : q(perStudentQuery);

  const [modesR, activityR, snapR, seriesR, hardR, historyR, studentsR, users] =
    await Promise.all([
      modesQ,
      activityQ,
      snapshotQ,
      seriesQ,
      hardQ,
      historyQ,
      studentsQ,
      opts.selfOnly
        ? Promise.resolve([])
        : listAnalyticsStudents(scope, {
            classId: opts.classId,
            mineTeacherId: opts.mineTeacherId,
          }),
    ]);

  const modeOrder: Mode[] = ["flashcard", "quiz", "spelling"];
  const modes: VocabularyModeStat[] = modeOrder.map((mode) => {
    const r = modesR.rows.find((x: Row) => x.mode === mode);
    return {
      mode,
      sessions: num(r?.sessions),
      wordsReviewed: num(r?.reviewed),
      accuracy: pct(r?.correct, r?.reviewed),
    };
  });

  const sessions = modes.reduce((a, m) => a + m.sessions, 0);
  const wordsReviewed = modes.reduce((a, m) => a + m.wordsReviewed, 0);
  const correctTotal = modesR.rows.reduce((a: number, r: Row) => a + num(r.correct), 0);
  const a = activityR.rows[0] ?? {};
  const totals: VocabularyAnalyticsTotals = {
    learners: num(a.learners),
    sessions,
    wordsReviewed,
    accuracy: pct(correctTotal, wordsReviewed),
    wordsAdded: num(a.added),
    activeDays: num(a.active_days),
    lastActiveAt: a.last_active ? num(a.last_active) : null,
  };

  const sn = snapR.rows[0] ?? {};
  const snapshot: VocabularySnapshot = {
    learnersWithWords: num(sn.learners),
    words: num(sn.words),
    phrases: num(sn.phrases),
    mastered: num(sn.mastered),
    newEntries: num(sn.new_entries),
    due: num(sn.due),
    hard: num(sn.hard),
    avgMastery: sn.avg_mastery === null || sn.avg_mastery === undefined
      ? null
      : Math.round(Number(sn.avg_mastery) * 10) / 10,
    levels: [0, 1, 2, 3, 4, 5].map((l) => num(sn[`l${l}`])),
  };

  const series: VocabularySeriesPoint[] = seriesR.rows.map((r: Row) => ({
    bucket: r.bucket as string,
    sessions: num(r.sessions),
    wordsReviewed: num(r.reviewed),
    wordsAdded: num(r.added),
    accuracy: pct(r.correct, r.reviewed),
  }));

  const hardWords: VocabularyHardWord[] = hardR.rows.map((r: Row) => ({
    word: r.word as string,
    attempts: num(r.attempts),
    wrong: num(r.wrong),
    learners: num(r.learners),
    // null across the board when no scope-visible bank holds the word
    syllabification: (r.syllabification as string) ?? null,
    partOfSpeech: (r.part_of_speech as string) ?? null,
    englishDefinition: (r.english_definition as string) ?? null,
    chineseDefinition: (r.chinese_definition as string) ?? null,
    example: (r.example as string) ?? null,
    entryType: (r.entry_type as "word" | "phrase") ?? null,
  }));

  const sessionHistory: VocabularySessionPoint[] = historyR.rows
    .map((r: Row) => ({
      at: num(r.completed_at),
      mode: r.mode as Mode,
      accuracy: num(r.accuracy),
      total: num(r.total_words),
    }))
    .reverse();

  const students: VocabularyStudentRow[] = studentsR.rows.map((r: Row) => ({
    userId: r.id as string,
    userName: (r.name as string) || (r.email as string) || "",
    userEmail: (r.email as string) || "",
    words: num(r.words),
    phrases: num(r.phrases),
    mastered: num(r.mastered),
    due: num(r.due),
    hard: num(r.hard),
    avgMastery:
      r.avg_mastery === null || r.avg_mastery === undefined
        ? null
        : Math.round(Number(r.avg_mastery) * 10) / 10,
    sessions: num(r.sessions),
    wordsReviewed: num(r.reviewed),
    accuracy: pct(r.correct, r.reviewed),
    trend:
      r.late_acc === null || r.late_acc === undefined || r.early_acc === null
        ? null
        : round0(Number(r.late_acc) - Number(r.early_acc)),
    lastActiveAt: r.last_active ? num(r.last_active) : null,
  }));

  return {
    range: opts.range,
    timeZone: tz,
    bucketUnit,
    totals,
    snapshot,
    modes,
    series,
    hardWords,
    sessionHistory,
    students,
    studentsTotal: num(studentsR.rows[0]?.total),
    users,
  };
}

/**
 * The signed-in learner's own analytics (the /vocabulary "My analytics" view):
 * the same Overview data as the staff dashboard, scoped to that one learner
 * (`selfOnly` skips the per-student table and the filter-bar user list, so
 * other students' identities are never queried, let alone returned).
 */
export async function getSelfVocabularyAnalytics(
  userId: string,
  opts: { range: number; timeZone: string }
): Promise<VocabularyAnalyticsData> {
  return getVocabularyAnalytics(
    { kind: "all" },
    { ...opts, userId, page: 1, pageSize: 1, selfOnly: true }
  );
}

/** Newest-first review sessions of every learner in scope (read only). */
export async function listStaffReviewSessions(
  scope: LanguageCheckStaffScope,
  opts: AnalyticsFilters & { page: number; pageSize: number; mode?: Mode }
): Promise<{ rows: VocabularyStaffSessionRow[]; total: number }> {
  const p = new Params();
  const cte = scopeCte(p, scope, {
    classId: opts.classId,
    mineTeacherId: opts.mineTeacherId,
    userId: opts.userId,
  });
  const clauses = [`s.completed_at >= ${p.add(cutoffMs(opts.range))}`];
  if (opts.mode) clauses.push(`s.mode = ${p.add(opts.mode)}`);
  const limit = p.add(opts.pageSize);
  const offset = p.add((opts.page - 1) * opts.pageSize);
  const res = await getPool().query(
    `WITH ${cte}
     SELECT s.id, s.user_id, sc.name, sc.email, s.mode, s.entry_type, s.total_words,
            s.correct_count, s.accuracy, s.completed_at, COUNT(*) OVER () AS total
     FROM vocabulary_review_sessions s JOIN sc ON sc.id = s.user_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY s.completed_at DESC, s.id
     LIMIT ${limit} OFFSET ${offset}`,
    p.values
  );
  return {
    total: num(res.rows[0]?.total),
    rows: res.rows.map((r: Row) => ({
      id: r.id as string,
      userId: r.user_id as string,
      userName: (r.name as string) || (r.email as string) || "",
      userEmail: (r.email as string) || "",
      mode: r.mode as Mode,
      entryType: ((r.entry_type as string) || "word") as "word" | "phrase",
      totalWords: num(r.total_words),
      correctCount: num(r.correct_count),
      accuracy: num(r.accuracy),
      completedAt: num(r.completed_at),
    })),
  };
}

/** Newest-first ledger feed (sessions finished, words added) for the learners in scope. */
export async function listVocabularyActivity(
  scope: LanguageCheckStaffScope,
  opts: AnalyticsFilters & { page: number; pageSize: number }
): Promise<{ rows: VocabularyActivityRow[]; total: number }> {
  const p = new Params();
  const cte = scopeCte(p, scope, {
    classId: opts.classId,
    mineTeacherId: opts.mineTeacherId,
    userId: opts.userId,
  });
  const since = p.add(cutoffMs(opts.range));
  const limit = p.add(opts.pageSize);
  const offset = p.add((opts.page - 1) * opts.pageSize);
  const res = await getPool().query(
    `WITH ${cte}
     SELECT e.id, e.user_id, sc.name, sc.email, e.type, e.entry_type, e.word, e.details,
            e.created_at, COUNT(*) OVER () AS total
     FROM vocabulary_activity_events e JOIN sc ON sc.id = e.user_id
     WHERE (EXTRACT(EPOCH FROM e.created_at) * 1000) >= ${since}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    p.values
  );
  return {
    total: num(res.rows[0]?.total),
    rows: res.rows.map((r: Row) => ({
      id: num(r.id),
      userId: r.user_id as string,
      userName: (r.name as string) || (r.email as string) || "",
      userEmail: (r.email as string) || "",
      type: r.type as VocabularyActivityRow["type"],
      entryType: (r.entry_type as "word" | "phrase" | null) ?? null,
      word: (r.word as string | null) ?? null,
      details: (r.details as Record<string, unknown>) ?? {},
      createdAt: new Date(r.created_at as string).getTime(),
    })),
  };
}

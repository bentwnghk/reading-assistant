import type { PoolClient } from "pg"
import { getClient, getPool } from "./db"
import {
  isStaffRole,
  resolveStaffScope,
  type LanguageCheckStaffScope,
} from "./language-check"
import {
  LANGUAGE_CHECK_LEARN_ACTIVE_GAP_SECONDS,
  LANGUAGE_CHECK_LEARN_MASTERY_DEVELOPING,
  LANGUAGE_CHECK_LEARN_MASTERY_SECURE,
  LANGUAGE_CHECK_LEARN_MAX_SESSIONS,
  type LanguageCheckCategory,
  type LanguageCheckLearnEventType,
} from "@/constants/languageCheck"
import { isStrictCategory, planLearnUnits } from "@/utils/languageCheckLearn"
import { gradeAnswer } from "@/utils/languageCheckLearnGrade"
import { mergeUnit, type UnitIncoming } from "@/utils/languageCheckLearnMerge"
import {
  practiceProgress,
  quizProgress,
  redactUnitForReview,
  rollupSession,
  statusFor,
} from "@/utils/languageCheckLearnProgress"
import type {
  LearnCategoryStat,
  LearnDashboardData,
  LearnDashboardTotals,
  LearnEventDetails,
  LearnEventInput,
  LearnEventRow,
  LearnLocation,
  LearnPatch,
  LearnQuizPoint,
  LearnRoundSummary,
  LearnRoundWire,
  LearnSeriesPoint,
  LearnSessionDetailWire,
  LearnSessionStatus,
  LearnSessionSummary,
  LearnSessionWire,
  LearnStaffDashboardData,
  LearnStaffSessionDetailWire,
  LearnStaffSessionSummary,
  LearnStudentRow,
  LearnSyncResponse,
  LearnUnitSummary,
  LearnUnitWire,
} from "@/utils/languageCheckLearnWire"

/**
 * Persistence, activity ledger and analytics for "Learn from your mistakes".
 * Self-contained: touches only the `language_check_learn_*` tables (and reads
 * `language_check_essays`, `users`, `classes`, `class_members` for scoping).
 *
 * Integrity rules:
 *  - the server builds a session's units from the STORED essay, never from a
 *    client-sent copy;
 *  - every ledger event is DERIVED from the difference between the stored state
 *    and the merged state of a save (plus a keyed idempotency index), so a
 *    replayed / duplicated / parallel save cannot double-count;
 *  - quiz scores are RE-GRADED here from the stored items and the learner's
 *    answers (the quiz holds only exactly-gradable formats), so a score cannot
 *    be typed in. Practice scores are self-reported (open answers are judged by
 *    the AI in the browser) and the dashboards label them accordingly.
 */

export class LearnValidationError extends Error {}

type Row = Record<string, unknown>

const toMs = (v: unknown): number => (v ? new Date(v as string).getTime() : 0)
const arrayOf = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v)
const round0 = (v: unknown): number | null => {
  const n = num(v)
  return n === null || Number.isNaN(n) ? null : Math.round(n)
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

function mapSession(row: Row): LearnSessionWire {
  return {
    id: row.id as string,
    essayId: (row.essay_id as string | null) ?? null,
    essayTitle: (row.essay_title as string) || "",
    age: Number(row.age),
    status: row.status as LearnSessionStatus,
    current: (row.current_location as LearnLocation) ?? { unit: 0, stage: "lesson" },
    units: arrayOf<LearnUnitWire>(row.units),
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

function mapSummary(row: Row): LearnSessionSummary {
  return {
    id: row.id as string,
    essayId: (row.essay_id as string | null) ?? null,
    essayTitle: (row.essay_title as string) || "",
    age: Number(row.age),
    status: row.status as LearnSessionStatus,
    unitCount: Number(row.unit_count) || 0,
    unitsCompleted: Number(row.units_completed) || 0,
    avgQuizPercent: round0(row.avg_quiz_percent),
    units: arrayOf<LearnUnitSummary>(row.summary),
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
    completedAt: row.completed_at ? toMs(row.completed_at) : null,
  }
}

function mapRoundSummary(row: Row): LearnRoundSummary {
  return {
    category: row.category as LanguageCheckCategory,
    round: Number(row.round),
    percent: Number(row.percent),
    correct: Number(row.correct),
    total: Number(row.total),
    mastery: row.mastery as LearnRoundSummary["mastery"],
    completedAt: toMs(row.completed_at),
  }
}

function mapRound(row: Row): LearnRoundWire {
  return {
    ...mapRoundSummary(row),
    items: arrayOf(row.items),
    results: (row.results as LearnRoundWire["results"]) ?? {},
  }
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

interface LedgerEvent {
  type: LanguageCheckLearnEventType
  category?: LanguageCheckCategory | null
  details?: LearnEventDetails
  key: string | null
}

async function writeEvents(
  db: Pick<PoolClient, "query">,
  ctx: { userId: string; sessionId: string | null; essayId: string | null; essayTitle: string },
  events: LedgerEvent[],
): Promise<void> {
  for (const e of events) {
    await db.query(
      `INSERT INTO language_check_learn_events
         (user_id, session_id, essay_id, essay_title, category, type, details, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING`,
      [
        ctx.userId,
        ctx.sessionId,
        ctx.essayId,
        ctx.essayTitle,
        e.category ?? null,
        e.type,
        JSON.stringify(e.details ?? {}),
        e.key,
      ],
    )
  }
}

/**
 * Events implied by a save: the difference between the stored units and the
 * merged units. Keys are deterministic per fact ("this item was answered"), so
 * the same fact can never be logged twice even if two saves race.
 */
export function deriveEvents(
  sessionId: string,
  before: readonly LearnUnitWire[],
  after: readonly LearnUnitWire[],
): LedgerEvent[] {
  const out: LedgerEvent[] = []
  for (const unit of after) {
    const prev = before.find((u) => u.category === unit.category)
    if (!prev) continue
    const c = unit.category
    const base = `${sessionId}:${c}`

    if (!prev.lesson && unit.lesson) {
      out.push({ type: "lesson_generated", category: c, key: `lg:${base}` })
    }
    if (!prev.lessonSeen && unit.lessonSeen) {
      out.push({ type: "lesson_viewed", category: c, key: `lv:${base}` })
    }

    const prevPracticeLen = prev.practice?.length ?? 0
    const practiceLen = unit.practice?.length ?? 0
    if (practiceLen > prevPracticeLen) {
      out.push({
        type: "practice_generated",
        category: c,
        details: { count: practiceLen - prevPracticeLen, total: practiceLen, more: prevPracticeLen > 0 },
        key: `pg:${base}:${practiceLen}`,
      })
    }

    const practiceItems = new Map((unit.practice ?? []).map((i) => [i.id, i]))
    for (const [itemId, result] of Object.entries(unit.practiceResults)) {
      const was = prev.practiceResults[itemId]
      if (!was) {
        out.push({
          type: "practice_answered",
          category: c,
          details: {
            item: itemId,
            itemType: practiceItems.get(itemId)?.type ?? null,
            score: result.score,
            correct: result.score >= 1,
          },
          key: `pa:${base}:${itemId}`,
        })
      }
      if (result.revealed && !was?.revealed) {
        out.push({
          type: "practice_revealed",
          category: c,
          details: { item: itemId },
          key: `pr:${base}:${itemId}`,
        })
      }
    }

    const pBefore = practiceProgress(prev.practice, prev.practiceResults)
    const pAfter = practiceProgress(unit.practice, unit.practiceResults)
    if (pAfter.percent !== null && (pBefore.percent === null || pBefore.total !== pAfter.total)) {
      out.push({
        type: "practice_completed",
        category: c,
        details: { percent: pAfter.percent, total: pAfter.total },
        key: `pc:${base}:${pAfter.total}`,
      })
    }

    if (unit.quizRound > prev.quizRound) {
      out.push({
        type: "quiz_retaken",
        category: c,
        details: { round: unit.quizRound },
        key: `qr:${base}:${unit.quizRound}`,
      })
    }
    const sameRound = unit.quizRound === prev.quizRound
    if (unit.quiz && (!sameRound || !prev.quiz)) {
      out.push({
        type: "quiz_generated",
        category: c,
        details: { round: unit.quizRound, count: unit.quiz.length },
        key: `qg:${base}:${unit.quizRound}`,
      })
    }

    const quizItems = new Map((unit.quiz ?? []).map((i) => [i.id, i]))
    for (const [itemId, result] of Object.entries(unit.quizResults)) {
      if (sameRound && prev.quizResults[itemId]) continue
      out.push({
        type: "quiz_answered",
        category: c,
        details: {
          item: itemId,
          itemType: quizItems.get(itemId)?.type ?? null,
          round: unit.quizRound,
          score: result.score,
          correct: result.correct,
        },
        key: `qa:${base}:${unit.quizRound}:${itemId}`,
      })
    }

    const qBefore = sameRound ? quizProgress(prev.quiz, prev.quizResults) : null
    const qAfter = quizProgress(unit.quiz, unit.quizResults)
    if (qAfter.percent !== null && (qBefore === null || qBefore.percent === null)) {
      out.push({
        type: "quiz_completed",
        category: c,
        details: {
          round: unit.quizRound,
          percent: qAfter.percent,
          correct: qAfter.correct,
          total: qAfter.total,
          mastery: qAfter.mastery,
        },
        key: `qc:${base}:${unit.quizRound}`,
      })
    }
  }
  return out
}

// ─── Sanitising an incoming save ─────────────────────────────────────────────

const OPEN_TYPES = new Set(["rewrite", "compose"])

/**
 * Applies the integrity rules to a merged unit: results must reference real
 * items, and every NEW quiz result is re-graded from the stored item and the
 * learner's answer (stored answers are final and never re-graded).
 */
function sanitizeUnit(merged: LearnUnitWire, stored: LearnUnitWire): LearnUnitWire {
  if (merged.quiz?.some((i) => OPEN_TYPES.has(i.type))) {
    throw new LearnValidationError("A quiz may only contain exactly-gradable questions.")
  }

  const practiceIds = new Set((merged.practice ?? []).map((i) => i.id))
  const practiceResults = Object.fromEntries(
    Object.entries(merged.practiceResults).filter(([id]) => practiceIds.has(id)),
  )

  const strict = isStrictCategory(merged.category)
  const items = new Map((merged.quiz ?? []).map((i) => [i.id, i]))
  const storedSameRound = stored.quizRound === merged.quizRound
  const quizResults: LearnUnitWire["quizResults"] = {}
  for (const [id, result] of Object.entries(merged.quizResults)) {
    const item = items.get(id)
    if (!item) continue
    if (storedSameRound && stored.quizResults[id]) {
      quizResults[id] = stored.quizResults[id]
      continue
    }
    // A device that generated a different quiz at the same time can send an
    // answer shaped for another question; skip it rather than fail the save.
    let grade: ReturnType<typeof gradeAnswer> = null
    try {
      grade = gradeAnswer(item, result.answer, strict)
    } catch {
      grade = null
    }
    if (!grade) continue
    quizResults[id] = { answer: result.answer, score: grade.score, correct: grade.correct }
  }

  return { ...merged, practiceResults, quizResults }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export type StartResult =
  | { ok: true; session: LearnSessionWire; resumed: boolean }
  | { ok: false; reason: "essay-not-found" | "essay-not-checked" | "no-mistakes" | "limit" }

async function inTransaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await getClient()
  try {
    await db.query("BEGIN")
    const result = await fn(db)
    await db.query("COMMIT")
    return result
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    db.release()
  }
}

function newUnit(plan: ReturnType<typeof planLearnUnits>["units"][number]): LearnUnitWire {
  return {
    category: plan.category,
    mistakeCount: plan.count,
    samples: plan.samples,
    lesson: null,
    practice: null,
    quiz: null,
    lessonSeen: false,
    practiceResults: {},
    quizResults: {},
    previousQuizPrompts: [],
    quizRound: 1,
  }
}

/**
 * Starts a learning session for the chosen categories of one of the caller's
 * checked essays, or resumes the unfinished session with the same selection
 * (essay + categories + level) — on any device.
 */
export async function startSession(
  userId: string,
  input: { essayId: string; categories: string[]; age: number },
): Promise<StartResult> {
  return inTransaction(async (db): Promise<StartResult> => {
    const essayRes = await db.query(
      `SELECT id, title, status, checked_text, corrections
       FROM language_check_essays WHERE id = $1 AND user_id = $2`,
      [input.essayId, userId],
    )
    const essay = essayRes.rows[0] as Row | undefined
    if (!essay) return { ok: false, reason: "essay-not-found" }
    if (essay.status !== "checked") return { ok: false, reason: "essay-not-checked" }

    const plan = planLearnUnits(
      {
        id: essay.id as string,
        checkedText: (essay.checked_text as string) || "",
        corrections: arrayOf<LanguageCheckError>(essay.corrections),
      },
      input.categories,
      input.age,
    )
    if (plan.units.length === 0) return { ok: false, reason: "no-mistakes" }

    // Two devices pressing "Start" together must not create two sessions.
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`lcl:${userId}:${plan.key}`])

    const existing = await db.query(
      `SELECT * FROM language_check_learn_sessions
       WHERE user_id = $1 AND selection_key = $2 AND status = 'in_progress'
       ORDER BY updated_at DESC LIMIT 1`,
      [userId, plan.key],
    )
    const title = (essay.title as string) || ""
    if (existing.rows[0]) {
      const session = mapSession(existing.rows[0])
      await writeEvents(
        db,
        { userId, sessionId: session.id, essayId: session.essayId, essayTitle: session.essayTitle },
        [{ type: "session_resumed", details: { via: "start" }, key: `sr:${session.id}:${Math.floor(Date.now() / 60000)}` }],
      )
      return { ok: true, session, resumed: true }
    }

    const count = await db.query(
      `SELECT COUNT(*)::int AS n FROM language_check_learn_sessions WHERE user_id = $1`,
      [userId],
    )
    if ((count.rows[0]?.n ?? 0) >= LANGUAGE_CHECK_LEARN_MAX_SESSIONS) {
      return { ok: false, reason: "limit" }
    }

    const units = plan.units.map(newUnit)
    const roll = rollupSession(units)
    const inserted = await db.query(
      `INSERT INTO language_check_learn_sessions
         (user_id, essay_id, essay_title, selection_key, age, units, summary, unit_count)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
       RETURNING *`,
      [
        userId,
        input.essayId,
        title,
        plan.key,
        input.age,
        JSON.stringify(units),
        JSON.stringify(roll.summary),
        units.length,
      ],
    )
    const session = mapSession(inserted.rows[0])
    await writeEvents(
      db,
      { userId, sessionId: session.id, essayId: input.essayId, essayTitle: title },
      [
        {
          type: "session_started",
          details: {
            age: input.age,
            units: units.length,
            categories: units.map((u) => u.category).join(","),
          },
          key: `ss:${session.id}`,
        },
      ],
    )
    return { ok: true, session, resumed: false }
  })
}

export async function listSessions(userId: string): Promise<LearnSessionSummary[]> {
  const { rows } = await getPool().query(
    `SELECT id, essay_id, essay_title, age, status, unit_count, units_completed,
            avg_quiz_percent, summary, created_at, updated_at, completed_at
     FROM language_check_learn_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, LANGUAGE_CHECK_LEARN_MAX_SESSIONS],
  )
  return rows.map(mapSummary)
}

export async function getSession(
  userId: string,
  id: string,
): Promise<LearnSessionDetailWire | null> {
  const { rows } = await getPool().query(
    `SELECT * FROM language_check_learn_sessions WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  if (!rows[0]) return null
  const rounds = await getPool().query(
    `SELECT * FROM language_check_learn_rounds WHERE session_id = $1
     ORDER BY completed_at ASC, round ASC`,
    [id],
  )
  return { session: mapSession(rows[0]), rounds: rounds.rows.map(mapRound) }
}

/**
 * The learner's history view of a session. Unlike `getSession` (which the
 * learning page needs in full to run the exercises), unfinished practice and
 * quiz content is withheld here — see `redactUnitForReview`.
 */
export async function getSessionForReview(
  userId: string,
  id: string,
): Promise<LearnSessionDetailWire | null> {
  const detail = await getSession(userId, id)
  if (!detail) return null
  return {
    session: { ...detail.session, units: detail.session.units.map(redactUnitForReview) },
    rounds: detail.rounds,
  }
}

/**
 * Applies a save: merges the browser's delta into the stored session under a
 * row lock (so two devices converge instead of overwriting each other),
 * archives finished quiz rounds, logs the derived events and returns the merged
 * state. An empty patch is a pull.
 */
export async function syncSession(
  userId: string,
  id: string,
  patch: LearnPatch,
): Promise<LearnSyncResponse | null> {
  return inTransaction(async (db) => {
    const locked = await db.query(
      `SELECT * FROM language_check_learn_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, userId],
    )
    const row = locked.rows[0] as Row | undefined
    if (!row) return null

    const stored = mapSession(row)
    const before = stored.units
    const incoming = new Map((patch.units ?? []).map((u) => [u.category, u as UnitIncoming]))

    const after = before.map((unit) => {
      const inc = incoming.get(unit.category)
      return inc ? sanitizeUnit(mergeUnit(unit, inc), unit) : unit
    })

    const derived = deriveEvents(id, before, after)
    const roll = rollupSession(after)
    const nextStatus = statusFor(roll.allDone, stored.status)
    const completedNow = nextStatus === "completed" && stored.status !== "completed"

    const unitCount = after.length
    const current: LearnLocation = (() => {
      const c = patch.current
      if (!c) return stored.current
      if (c === "summary") return c
      return c.unit < unitCount ? c : stored.current
    })()

    const ctx = {
      userId,
      sessionId: id,
      essayId: stored.essayId,
      essayTitle: stored.essayTitle,
    }

    // Finished quiz rounds are archived; a retake never overwrites them.
    for (const e of derived) {
      if (e.type !== "quiz_completed" || !e.category) continue
      const unit = after.find((u) => u.category === e.category)
      if (!unit?.quiz) continue
      const p = quizProgress(unit.quiz, unit.quizResults)
      if (p.percent === null || p.mastery === null) continue
      await db.query(
        `INSERT INTO language_check_learn_rounds
           (session_id, user_id, category, round, percent, correct, total, mastery, items, results)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
         ON CONFLICT (session_id, category, round) DO NOTHING`,
        [
          id,
          userId,
          unit.category,
          unit.quizRound,
          p.percent,
          p.correct,
          p.total,
          p.mastery,
          JSON.stringify(unit.quiz),
          JSON.stringify(unit.quizResults),
        ],
      )
    }

    // Behavioural events only the browser can see. Key-deduped; the category
    // must belong to the session.
    const known = new Set(after.map((u) => u.category))
    const clientEvents: LedgerEvent[] = (patch.events ?? [])
      .filter((e: LearnEventInput) => !e.category || known.has(e.category))
      .map((e) => ({
        type: e.type,
        category: e.category ?? null,
        details: e.details,
        key: `c:${e.key}`,
      }))

    const events = [...derived, ...clientEvents]
    if (completedNow) {
      events.push({
        type: "session_completed",
        details: { average: roll.avgQuizPercent, units: unitCount },
        key: `sc:${id}`,
      })
    }
    await writeEvents(db, ctx, events)

    // Progress does not always imply an event (e.g. a wrong answer retried
    // correctly while other items are still open), so compare the state itself.
    const changed =
      completedNow ||
      JSON.stringify(after) !== JSON.stringify(before) ||
      JSON.stringify(current) !== JSON.stringify(stored.current)
    const updated = changed
      ? await db.query(
          `UPDATE language_check_learn_sessions
           SET units = $3::jsonb, summary = $4::jsonb, current_location = $5::jsonb,
               status = $6, unit_count = $7, units_completed = $8, avg_quiz_percent = $9,
               completed_at = CASE WHEN $10::boolean THEN NOW() ELSE completed_at END
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [
            id,
            userId,
            JSON.stringify(after),
            JSON.stringify(roll.summary),
            JSON.stringify(current),
            nextStatus,
            roll.unitCount,
            roll.unitsCompleted,
            roll.avgQuizPercent,
            completedNow,
          ],
        )
      : { rows: [row] }

    const rounds = await db.query(
      `SELECT category, round, percent, correct, total, mastery, completed_at
       FROM language_check_learn_rounds WHERE session_id = $1
       ORDER BY completed_at ASC, round ASC`,
      [id],
    )
    return { session: mapSession(updated.rows[0]), rounds: rounds.rows.map(mapRoundSummary) }
  })
}

/** Deletes a session and its archived rounds; the activity ledger is kept. */
export async function deleteSession(userId: string, id: string): Promise<boolean> {
  return inTransaction(async (db) => {
    const found = await db.query(
      `SELECT essay_id, essay_title FROM language_check_learn_sessions
       WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, userId],
    )
    const row = found.rows[0] as Row | undefined
    if (!row) return false
    await db.query(`DELETE FROM language_check_learn_sessions WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ])
    // The FK nulls session_id on earlier events; the deletion itself is logged
    // without a session reference.
    await writeEvents(
      db,
      {
        userId,
        sessionId: null,
        essayId: (row.essay_id as string | null) ?? null,
        essayTitle: (row.essay_title as string) || "",
      },
      [{ type: "session_deleted", key: `sd:${id}` }],
    )
    return true
  })
}

// ─── Scoping (self / staff) ──────────────────────────────────────────────────

export type LearnScope = LanguageCheckStaffScope | { kind: "self"; userId: string }

export { isStaffRole, resolveStaffScope }

class Params {
  values: unknown[] = []
  add(value: unknown): string {
    this.values.push(value)
    return `$${this.values.length}`
  }
}

/** Visibility of rows keyed by `<alias>.user_id` for the given scope. */
function scopeClauses(p: Params, scope: LearnScope, alias: string): string[] {
  switch (scope.kind) {
    case "self":
      return [`${alias}.user_id = ${p.add(scope.userId)}`]
    case "teacher":
      return [
        `EXISTS (SELECT 1 FROM class_members scm JOIN classes sc ON sc.id = scm.class_id
                 WHERE scm.student_id = ${alias}.user_id AND sc.teacher_id = ${p.add(scope.teacherId)})`,
      ]
    case "school":
      return [
        `EXISTS (SELECT 1 FROM users su WHERE su.id = ${alias}.user_id AND su.school_id = ${p.add(scope.schoolId)})`,
      ]
    case "all":
      return []
  }
}

export interface LearnFilters {
  /** Days back from now; 0 = all time. */
  range: number
  userId?: string
  classId?: string
}

function filterClauses(
  p: Params,
  scope: LearnScope,
  alias: string,
  f: LearnFilters,
  opts: { time?: string } = {},
): string[] {
  const clauses = scopeClauses(p, scope, alias)
  if (f.userId && scope.kind !== "self") clauses.push(`${alias}.user_id = ${p.add(f.userId)}`)
  if (f.classId) {
    clauses.push(
      `${alias}.user_id IN (SELECT student_id FROM class_members WHERE class_id = ${p.add(f.classId)})`,
    )
  }
  if (f.range > 0 && opts.time) {
    clauses.push(`${opts.time} >= NOW() - make_interval(days => ${p.add(f.range)})`)
  }
  return clauses
}

const whereOf = (clauses: string[]) => (clauses.length ? `WHERE ${clauses.join(" AND ")}` : "")

// ─── Dashboards ──────────────────────────────────────────────────────────────

const EV = "language_check_learn_events"

/** Validates an IANA zone name; anything else falls back to UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC"
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz })
    return tz
  } catch {
    return "UTC"
  }
}

function emptyTotals(): LearnDashboardTotals {
  return {
    learners: 0,
    sessionsStarted: 0,
    sessionsCompleted: 0,
    lessonsViewed: 0,
    practiceAnswered: 0,
    practiceAccuracy: null,
    quizzesCompleted: 0,
    avgQuizPercent: null,
    improvement: null,
    topicsSecure: 0,
    topicsDeveloping: 0,
    topicsReview: 0,
    activeDays: 0,
    activeMinutes: 0,
    lastActiveAt: null,
  }
}

/** Mastery thresholds as SQL, so topic buckets use the same cut-offs as the UI. */
function masterySql(p: Params, expr: string) {
  const secure = p.add(LANGUAGE_CHECK_LEARN_MASTERY_SECURE)
  const developing = p.add(LANGUAGE_CHECK_LEARN_MASTERY_DEVELOPING)
  return {
    secure: `${expr} >= ${secure}`,
    developing: `${expr} >= ${developing} AND ${expr} < ${secure}`,
    review: `${expr} < ${developing}`,
  }
}

/**
 * Everything the student dashboard and the staff dashboard show, computed from
 * the activity ledger (so history survives deleting a session or an essay).
 * `withStudents` adds the per-learner table the staff view needs.
 */
async function computeDashboard(
  scope: LearnScope,
  f: LearnFilters,
  opts: { timeZone: string; withStudents?: { page: number; pageSize: number } },
): Promise<LearnDashboardData & { students?: LearnStudentRow[] }> {
  const tz = safeTimeZone(opts.timeZone)
  const bucketUnit: "day" | "week" = f.range > 0 && f.range <= 30 ? "day" : "week"
  const pool = getPool()

  // Shared WHERE for "learning activity" rows (a deleted session is not activity).
  const base = new Params()
  const baseWhere = whereOf([
    ...filterClauses(base, scope, "ev", f, { time: "ev.created_at" }),
    `ev.type <> 'session_deleted'`,
  ])
  const baseValues = base.values
  // A reusable CTE over those rows.
  const evCte = `ev AS (SELECT * FROM ${EV} ev ${baseWhere})`

  // Latest + first finished quiz per (learner, topic) in the window.
  const pairCte = `
    q AS (
      SELECT ev.id, ev.user_id, ev.category, (ev.details->>'percent')::numeric AS percent,
             ROW_NUMBER() OVER (PARTITION BY ev.user_id, ev.category ORDER BY ev.created_at DESC, ev.id DESC) AS rl,
             ROW_NUMBER() OVER (PARTITION BY ev.user_id, ev.category ORDER BY ev.created_at ASC, ev.id ASC) AS rf
      FROM ev WHERE ev.type = 'quiz_completed' AND ev.category IS NOT NULL
    ),
    pair AS (
      SELECT l.user_id, l.category, l.percent AS latest, f.percent AS first, (l.id <> f.id) AS retaken
      FROM q l JOIN q f ON f.user_id = l.user_id AND f.category = l.category AND f.rf = 1
      WHERE l.rl = 1
    )`

  const gapCte = `
    gaps AS (
      SELECT ev.user_id,
             EXTRACT(EPOCH FROM (ev.created_at - LAG(ev.created_at) OVER (PARTITION BY ev.user_id ORDER BY ev.created_at, ev.id))) AS gap
      FROM ev
    )`

  // 1 · totals
  const totalsQ = pool.query(
    `WITH ${evCte}
     SELECT COUNT(DISTINCT user_id)::int AS learners,
            COUNT(*) FILTER (WHERE type = 'session_started')::int AS sessions_started,
            COUNT(*) FILTER (WHERE type = 'session_completed')::int AS sessions_completed,
            COUNT(*) FILTER (WHERE type = 'lesson_viewed')::int AS lessons_viewed,
            COUNT(*) FILTER (WHERE type = 'practice_answered')::int AS practice_answered,
            AVG((details->>'score')::numeric) FILTER (WHERE type = 'practice_answered') AS practice_acc,
            COUNT(*) FILTER (WHERE type = 'quiz_completed')::int AS quizzes_completed,
            AVG((details->>'percent')::numeric) FILTER (WHERE type = 'quiz_completed') AS quiz_avg,
            COUNT(DISTINCT (created_at AT TIME ZONE $${baseValues.length + 1})::date)::int AS active_days,
            MAX(created_at) AS last_active
     FROM ev`,
    [...baseValues, tz],
  )

  // 2 · time on task (gaps between consecutive events, capped)
  const minutesQ = pool.query(
    `WITH ${evCte}, ${gapCte}
     SELECT COALESCE(SUM(gap), 0)::float AS seconds FROM gaps
     WHERE gap IS NOT NULL AND gap <= $${baseValues.length + 1}`,
    [...baseValues, LANGUAGE_CHECK_LEARN_ACTIVE_GAP_SECONDS],
  )

  // 3 · topic buckets + improvement (per learner × topic)
  const mp = new Params()
  mp.values.push(...baseValues)
  const m = masterySql(mp, "latest")
  const topicsQ = pool.query(
    `WITH ${evCte}, ${pairCte}
     SELECT COUNT(*) FILTER (WHERE ${m.secure})::int AS secure,
            COUNT(*) FILTER (WHERE ${m.developing})::int AS developing,
            COUNT(*) FILTER (WHERE ${m.review})::int AS review,
            AVG(latest - first) FILTER (WHERE retaken) AS improvement
     FROM pair`,
    mp.values,
  )

  // 4 · per-topic stats
  const cp = new Params()
  cp.values.push(...baseValues)
  const cm = masterySql(cp, "latest")
  const categoriesQ = pool.query(
    `WITH ${evCte}, ${pairCte},
     latest_by_cat AS (
       SELECT category,
              AVG(latest) AS avg_latest,
              AVG(latest - first) FILTER (WHERE retaken) AS improvement,
              COUNT(*) FILTER (WHERE ${cm.secure})::int AS secure,
              COUNT(*) FILTER (WHERE ${cm.developing})::int AS developing,
              COUNT(*) FILTER (WHERE ${cm.review})::int AS review
       FROM pair GROUP BY category
     ),
     events_by_cat AS (
       SELECT category,
              COUNT(DISTINCT user_id)::int AS learners,
              COUNT(*) FILTER (WHERE type = 'quiz_completed')::int AS quizzes,
              AVG((details->>'score')::numeric) FILTER (WHERE type = 'practice_answered') AS practice_acc
       FROM ev WHERE category IS NOT NULL GROUP BY category
     )
     SELECT e.category, e.learners, e.quizzes, e.practice_acc,
            l.avg_latest, l.improvement,
            COALESCE(l.secure, 0) AS secure, COALESCE(l.developing, 0) AS developing,
            COALESCE(l.review, 0) AS review
     FROM events_by_cat e LEFT JOIN latest_by_cat l ON l.category = e.category
     ORDER BY e.learners DESC, e.category`,
    cp.values,
  )

  // 5 · activity series
  const sp = new Params()
  sp.values.push(...baseValues)
  const tzP = sp.add(tz)
  const unitP = sp.add(bucketUnit)
  const seriesQ = pool.query(
    `WITH ${evCte}
     SELECT to_char(date_trunc(${unitP}, created_at AT TIME ZONE ${tzP}), 'YYYY-MM-DD') AS bucket,
            COUNT(*)::int AS events,
            COUNT(*) FILTER (WHERE type = 'practice_answered')::int AS practice_answered,
            COUNT(*) FILTER (WHERE type = 'quiz_completed')::int AS quizzes_completed,
            AVG((details->>'percent')::numeric) FILTER (WHERE type = 'quiz_completed') AS quiz_avg
     FROM ev GROUP BY 1 ORDER BY 1`,
    sp.values,
  )

  // 6 · every finished quiz (progress over time) — only for one learner's view
  const singleLearner = scope.kind === "self" || !!f.userId
  const historyQ = singleLearner
    ? pool.query(
        `WITH ${evCte}
         SELECT id, user_id, session_id, category, created_at,
                (details->>'percent')::numeric AS percent, (details->>'round')::int AS round
         FROM ev WHERE type = 'quiz_completed' AND category IS NOT NULL
         ORDER BY created_at DESC, id DESC LIMIT 300`,
        baseValues,
      )
    : Promise.resolve({ rows: [] as Row[] })

  // 7 · per-learner table (staff)
  let studentsQ: Promise<{ rows: Row[] }> = Promise.resolve({ rows: [] })
  if (opts.withStudents) {
    const stP = new Params()
    stP.values.push(...baseValues)
    const gap = stP.add(LANGUAGE_CHECK_LEARN_ACTIVE_GAP_SECONDS)
    const limit = stP.add(opts.withStudents.pageSize)
    const offset = stP.add((opts.withStudents.page - 1) * opts.withStudents.pageSize)
    studentsQ = pool.query(
      `WITH ${evCte}, ${pairCte}, ${gapCte},
       act AS (
         SELECT user_id, SUM(gap) FILTER (WHERE gap <= ${gap}) AS seconds FROM gaps GROUP BY user_id
       ),
       per_user AS (
         SELECT user_id, AVG(latest) AS avg_latest,
                AVG(latest - first) FILTER (WHERE retaken) AS improvement,
                (ARRAY_AGG(category ORDER BY latest ASC, category))[1] AS weakest,
                MIN(latest) AS weakest_percent
         FROM pair GROUP BY user_id
       ),
       agg AS (
         SELECT user_id,
                COUNT(*) FILTER (WHERE type = 'session_started')::int AS sessions_started,
                COUNT(*) FILTER (WHERE type = 'session_completed')::int AS sessions_completed,
                COUNT(*) FILTER (WHERE type = 'quiz_completed')::int AS quizzes_completed,
                AVG((details->>'score')::numeric) FILTER (WHERE type = 'practice_answered') AS practice_acc,
                MAX(created_at) AS last_active
         FROM ev GROUP BY user_id
       )
       SELECT a.*, u.name, u.email, p.avg_latest, p.improvement, p.weakest, p.weakest_percent,
              COALESCE(act.seconds, 0)::float AS seconds
       FROM agg a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN per_user p ON p.user_id = a.user_id
       LEFT JOIN act ON act.user_id = a.user_id
       ORDER BY a.last_active DESC, u.name
       LIMIT ${limit} OFFSET ${offset}`,
      stP.values,
    )
  }

  const [totalsR, minutesR, topicsR, categoriesR, seriesR, historyR, studentsR] =
    await Promise.all([totalsQ, minutesQ, topicsQ, categoriesQ, seriesQ, historyQ, studentsQ])

  const t = totalsR.rows[0] ?? {}
  const topics = topicsR.rows[0] ?? {}
  const totals: LearnDashboardTotals = {
    ...emptyTotals(),
    learners: Number(t.learners) || 0,
    sessionsStarted: Number(t.sessions_started) || 0,
    sessionsCompleted: Number(t.sessions_completed) || 0,
    lessonsViewed: Number(t.lessons_viewed) || 0,
    practiceAnswered: Number(t.practice_answered) || 0,
    practiceAccuracy: t.practice_acc === null || t.practice_acc === undefined ? null : Math.round(Number(t.practice_acc) * 100),
    quizzesCompleted: Number(t.quizzes_completed) || 0,
    avgQuizPercent: round0(t.quiz_avg),
    improvement: round0(topics.improvement),
    topicsSecure: Number(topics.secure) || 0,
    topicsDeveloping: Number(topics.developing) || 0,
    topicsReview: Number(topics.review) || 0,
    activeDays: Number(t.active_days) || 0,
    activeMinutes: Math.round((Number(minutesR.rows[0]?.seconds) || 0) / 60),
    lastActiveAt: t.last_active ? toMs(t.last_active) : null,
  }

  const series: LearnSeriesPoint[] = seriesR.rows.map((r: Row) => ({
    bucket: r.bucket as string,
    events: Number(r.events) || 0,
    practiceAnswered: Number(r.practice_answered) || 0,
    quizzesCompleted: Number(r.quizzes_completed) || 0,
    avgQuizPercent: round0(r.quiz_avg),
  }))

  const categories: LearnCategoryStat[] = categoriesR.rows.map((r: Row) => ({
    category: r.category as LanguageCheckCategory,
    learners: Number(r.learners) || 0,
    quizzes: Number(r.quizzes) || 0,
    avgLatest: round0(r.avg_latest),
    improvement: round0(r.improvement),
    secure: Number(r.secure) || 0,
    developing: Number(r.developing) || 0,
    review: Number(r.review) || 0,
    practiceAccuracy: r.practice_acc === null || r.practice_acc === undefined ? null : Math.round(Number(r.practice_acc) * 100),
  }))

  const quizHistory: LearnQuizPoint[] = historyR.rows
    .map((r: Row) => ({
      at: toMs(r.created_at),
      category: r.category as LanguageCheckCategory,
      percent: Number(r.percent) || 0,
      round: Number(r.round) || 1,
      sessionId: (r.session_id as string | null) ?? "",
    }))
    .reverse()

  const students: LearnStudentRow[] | undefined = opts.withStudents
    ? studentsR.rows.map((r: Row) => ({
        userId: r.user_id as string,
        userName: (r.name as string) || (r.email as string) || "",
        userEmail: (r.email as string) || "",
        sessionsStarted: Number(r.sessions_started) || 0,
        sessionsCompleted: Number(r.sessions_completed) || 0,
        quizzesCompleted: Number(r.quizzes_completed) || 0,
        avgQuizPercent: round0(r.avg_latest),
        improvement: round0(r.improvement),
        practiceAccuracy: r.practice_acc === null || r.practice_acc === undefined ? null : Math.round(Number(r.practice_acc) * 100),
        activeMinutes: Math.round((Number(r.seconds) || 0) / 60),
        lastActiveAt: r.last_active ? toMs(r.last_active) : null,
        weakest: r.weakest
          ? { category: r.weakest as LanguageCheckCategory, percent: Math.round(Number(r.weakest_percent)) }
          : null,
      }))
    : undefined

  return { range: f.range, timeZone: tz, bucketUnit, totals, series, categories, quizHistory, students }
}

export async function getOwnDashboard(
  userId: string,
  opts: { range: number; timeZone: string },
): Promise<LearnDashboardData> {
  const { students: _students, ...data } = await computeDashboard(
    { kind: "self", userId },
    { range: opts.range },
    { timeZone: opts.timeZone },
  )
  return data
}

export async function getStaffDashboard(
  scope: LanguageCheckStaffScope,
  opts: {
    range: number
    timeZone: string
    userId?: string
    classId?: string
    page: number
    pageSize: number
  },
): Promise<LearnStaffDashboardData> {
  const filters: LearnFilters = { range: opts.range, userId: opts.userId, classId: opts.classId }
  const data = await computeDashboard(scope, filters, {
    timeZone: opts.timeZone,
    withStudents: { page: opts.page, pageSize: opts.pageSize },
  })

  // Student picker: scope + class only (never narrowed by student/range), like
  // the essay log, so switching students stays possible.
  const p = new Params()
  const where = whereOf([
    ...filterClauses(p, scope, "ev", { range: 0, classId: opts.classId }),
    `ev.type <> 'session_deleted'`,
  ])
  const users = await getPool().query(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM ${EV} ev JOIN users u ON u.id = ev.user_id
     ${where}
     ORDER BY u.name, u.email
     LIMIT 1000`,
    p.values,
  )

  const { students, ...rest } = data
  return {
    ...rest,
    students: students ?? [],
    studentsTotal: data.totals.learners,
    users: users.rows.map((r: Row) => ({
      id: r.id as string,
      name: (r.name as string) || (r.email as string) || "",
      email: (r.email as string) || "",
    })),
  }
}

/**
 * Students a staff member can pick on /language-check: everyone in scope who
 * has an essay or a learning event (so a learner whose essay was deleted but
 * whose learning history survives is still selectable). Narrowed by class only —
 * never by other filters — so the shared picker stays switchable.
 */
export async function listStaffStudents(
  scope: LanguageCheckStaffScope,
  opts: { classId?: string },
): Promise<{ id: string; name: string; email: string }[]> {
  const p = new Params()
  const where = whereOf(filterClauses(p, scope, "x", { range: 0, classId: opts.classId }))
  const res = await getPool().query(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM (
       SELECT user_id FROM language_check_essays
       UNION
       SELECT user_id FROM ${EV} WHERE type <> 'session_deleted'
     ) x
     JOIN users u ON u.id = x.user_id
     ${where}
     ORDER BY u.name, u.email
     LIMIT 1000`,
    p.values,
  )
  return res.rows.map((r: Row) => ({
    id: r.id as string,
    name: (r.name as string) || (r.email as string) || "",
    email: (r.email as string) || "",
  }))
}

/**
 * Every student a staff member may scan an essay for (the "Check an essay
 * for" picker) — not limited to learners who already have essays/learning
 * history, because the whole point is uploading the FIRST one for them.
 * Same scope semantics as canUploadForStudent: teacher → own classes,
 * admin → school, super-admin → everyone; current, non-banned students only
 * (roles live in user_roles; no row there = implicit student, like the
 * user-management queries). `classId` narrows to one class; `mineTeacherId`
 * (the picker's "My Classes" default for admins/super-admins who teach)
 * narrows to the students of the classes that teacher owns.
 */
export async function listAllStaffStudents(
  scope: LanguageCheckStaffScope,
  opts: { classId?: string; mineTeacherId?: string },
): Promise<{ id: string; name: string; email: string }[]> {
  const p = new Params()
  const clauses: string[] = [
    `COALESCE(ur.role, 'student') = 'student'`,
    `COALESCE(u.banned, FALSE) = FALSE`,
  ]
  if (scope.kind === "teacher") {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM class_members acm
        JOIN classes ac ON ac.id = acm.class_id
        WHERE acm.student_id = u.id AND ac.teacher_id = ${p.add(scope.teacherId)}
      )`,
    )
  } else if (scope.kind === "school") {
    clauses.push(`u.school_id = ${p.add(scope.schoolId)}`)
  }
  if (opts.mineTeacherId) {
    clauses.push(
      `u.id IN (
        SELECT mcm.student_id FROM class_members mcm
        JOIN classes mc ON mc.id = mcm.class_id
        WHERE mc.teacher_id = ${p.add(opts.mineTeacherId)}
      )`,
    )
  } else if (opts.classId) {
    clauses.push(
      `u.id IN (SELECT student_id FROM class_members WHERE class_id = ${p.add(opts.classId)})`,
    )
  }
  const res = await getPool().query(
    `SELECT u.id, u.name, u.email FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.name, u.email
     LIMIT 1000`,
    p.values,
  )
  return res.rows.map((r: Row) => ({
    id: r.id as string,
    name: (r.name as string) || (r.email as string) || "",
    email: (r.email as string) || "",
  }))
}

// ─── Activity feed ───────────────────────────────────────────────────────────

export async function listEvents(
  scope: LearnScope,
  opts: LearnFilters & { page: number; pageSize: number },
): Promise<{ rows: LearnEventRow[]; total: number }> {
  const p = new Params()
  const where = whereOf(filterClauses(p, scope, "ev", opts, { time: "ev.created_at" }))
  const values = [...p.values]
  const limit = `$${values.length + 1}`
  const offset = `$${values.length + 2}`
  const [list, count] = await Promise.all([
    getPool().query(
      `SELECT ev.id, ev.user_id, ev.session_id, ev.essay_title, ev.category, ev.type, ev.details,
              ev.created_at, u.name AS user_name, u.email AS user_email
       FROM ${EV} ev JOIN users u ON u.id = ev.user_id
       ${where}
       ORDER BY ev.created_at DESC, ev.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [...values, opts.pageSize, (opts.page - 1) * opts.pageSize],
    ),
    getPool().query(`SELECT COUNT(*)::int AS n FROM ${EV} ev ${where}`, values),
  ])
  return {
    total: Number(count.rows[0]?.n) || 0,
    rows: list.rows.map(
      (r: Row): LearnEventRow => ({
        id: String(r.id),
        userId: r.user_id as string,
        userName: (r.user_name as string) || (r.user_email as string) || "",
        userEmail: (r.user_email as string) || "",
        sessionId: (r.session_id as string | null) ?? null,
        essayTitle: (r.essay_title as string) || "",
        category: (r.category as LanguageCheckCategory | null) ?? null,
        type: r.type as LanguageCheckLearnEventType,
        details: (r.details as LearnEventDetails) ?? {},
        createdAt: toMs(r.created_at),
      }),
    ),
  }
}

// ─── Staff session views ─────────────────────────────────────────────────────

export async function listStaffSessions(
  scope: LanguageCheckStaffScope,
  opts: { userId?: string; classId?: string; page: number; pageSize: number },
): Promise<{ rows: LearnStaffSessionSummary[]; total: number }> {
  const p = new Params()
  const where = whereOf(filterClauses(p, scope, "s", { range: 0, userId: opts.userId, classId: opts.classId }))
  const values = [...p.values]
  const limit = `$${values.length + 1}`
  const offset = `$${values.length + 2}`
  const [list, count] = await Promise.all([
    getPool().query(
      `SELECT s.id, s.essay_id, s.essay_title, s.age, s.status, s.unit_count, s.units_completed,
              s.avg_quiz_percent, s.summary, s.created_at, s.updated_at, s.completed_at,
              s.user_id, u.name AS user_name, u.email AS user_email
       FROM language_check_learn_sessions s JOIN users u ON u.id = s.user_id
       ${where}
       ORDER BY s.updated_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [...values, opts.pageSize, (opts.page - 1) * opts.pageSize],
    ),
    getPool().query(
      `SELECT COUNT(*)::int AS n FROM language_check_learn_sessions s ${where}`,
      values,
    ),
  ])
  return {
    total: Number(count.rows[0]?.n) || 0,
    rows: list.rows.map(
      (r: Row): LearnStaffSessionSummary => ({
        ...mapSummary(r),
        userId: r.user_id as string,
        userName: (r.user_name as string) || (r.user_email as string) || "",
        userEmail: (r.user_email as string) || "",
      }),
    ),
  }
}

/** Read-only staff view of one learning session (content, answers, every quiz round). */
export async function getStaffSession(
  scope: LanguageCheckStaffScope,
  id: string,
): Promise<LearnStaffSessionDetailWire | null> {
  const p = new Params()
  const clauses = scopeClauses(p, scope, "s")
  clauses.push(`s.id = ${p.add(id)}`)
  const { rows } = await getPool().query(
    `SELECT s.*, u.name AS user_name, u.email AS user_email
     FROM language_check_learn_sessions s JOIN users u ON u.id = s.user_id
     ${whereOf(clauses)}`,
    p.values,
  )
  const row = rows[0] as Row | undefined
  if (!row) return null
  const rounds = await getPool().query(
    `SELECT * FROM language_check_learn_rounds WHERE session_id = $1
     ORDER BY completed_at ASC, round ASC`,
    [id],
  )
  return {
    session: mapSession(row),
    rounds: rounds.rows.map(mapRound),
    user: {
      id: row.user_id as string,
      name: (row.user_name as string) || (row.user_email as string) || "",
      email: (row.user_email as string) || "",
    },
  }
}

/**
 * Statistical analysis for an assignment roster.
 *
 * Pure, presentation-agnostic functions that derive aggregate insight from a
 * list of {@link AssignmentSubmission} rows. All computations are client-side
 * friendly (no I/O) so the teacher's assignment detail page can render them
 * synchronously from the already-fetched roster.
 *
 * CRITICAL — activities are NOT all stored as their "raw" game metric:
 *   - Quizzes/tests (testScore, vocabularyQuizScore, grammarQuizScore) are stored
 *     directly as a bounded 0–100 percentage.
 *   - Game activities (spelling, grammar games) store BOTH an unbounded point
 *     total (best score) AND a bounded 0–100 *accuracy*. This module analyses the
 *     accuracy fields (spellingGameAccuracy, grammarGameAccuracy) so every
 *     activity is on a common 0–100 scale and the 50/70 thresholds, tier
 *     classification, pass rate, distribution buckets and the 0–100 bar chart
 *     axis are all valid.
 *
 *   - `null` score → the student has not attempted that activity (renders "-")
 *   - score < 50   → "struggling" tier (red)
 *   - 50 ≤ s < 70  → "developing" tier (amber)
 *   - score ≥ 70   → "pass" / mastery tier (green)
 */

export type ActivityKey =
  | "testScore"
  | "vocabularyQuizScore"
  | "spellingGameAccuracy"
  | "grammarQuizScore"
  // Grammar games store unbounded point high scores; `grammarGameAccuracy` is the
  // real 0–100 accuracy and is the analytically correct metric here.
  | "grammarGameAccuracy"

export type ScoreScale = "percentage" | "points"

/** Score ≥ this value counts as a pass (mastery). Mirrors the 70 threshold in the Excel exports. */
export const PASS_THRESHOLD = 70

/** A score strictly below this marks a student as struggling in that activity. */
export const STRUGGLE_THRESHOLD = 50

/** The five assessable activities, in canonical column order. */
export const ACTIVITY_KEYS: readonly ActivityKey[] = [
  "testScore",
  "vocabularyQuizScore",
  "spellingGameAccuracy",
  "grammarQuizScore",
  "grammarGameAccuracy",
] as const

/**
 * How each activity's stored value is scaled. Governs which analyses apply.
 * All five activities now persist a bounded 0–100 value (spelling and grammar
 * games use their persisted *accuracy* rather than their unbounded point scores).
 */
export const ACTIVITY_SCALE: Record<ActivityKey, ScoreScale> = {
  testScore: "percentage",
  vocabularyQuizScore: "percentage",
  spellingGameAccuracy: "percentage", // 0–100 running average (not the unbounded best-score points)
  grammarQuizScore: "percentage",
  grammarGameAccuracy: "percentage", // 0–100 accuracy (not the unbounded best-score points)
}

/** Activities whose stored value is a bounded 0–100 percentage. */
export const PERCENTAGE_KEYS: readonly ActivityKey[] = ACTIVITY_KEYS.filter(
  (k) => ACTIVITY_SCALE[k] === "percentage",
)

export type PerformanceTier = "none" | "below" | "mid" | "pass"

/** Hex fills per performance tier, reused by charts and legend. */
export const TIER_COLORS: Record<PerformanceTier, string> = {
  none: "#94a3b8", // slate-400 — no attempts
  below: "#ef4444", // red-500 — struggling
  mid: "#f59e0b", // amber-500 — developing
  pass: "#22c55e", // green-500 — mastery
}

/**
 * Classify a percentage-scale score into a performance tier. Returns "none" for
 * null/undefined. Only meaningful for {@link ScoreScale.percentage} activities.
 */
export function tierOf(score: number | null | undefined): PerformanceTier {
  if (score == null) return "none"
  if (score < STRUGGLE_THRESHOLD) return "below"
  if (score < PASS_THRESHOLD) return "mid"
  return "pass"
}

export interface ScoreDistribution {
  /** Students who attempted the activity (non-null score). */
  attempted: number
  /** 0 ≤ score < STRUGGLE_THRESHOLD. */
  below: number
  /** STRUGGLE_THRESHOLD ≤ score < PASS_THRESHOLD. */
  mid: number
  /** score ≥ PASS_THRESHOLD. */
  pass: number
}

export interface ActivityStat {
  key: ActivityKey
  scale: ScoreScale
  values: number[]
  /** Number of students who attempted (non-null score). */
  attempted: number
  /** attempted / total roster, as a 0–100 percentage. */
  participationRate: number
  /** Arithmetic mean of attempts, or null if nobody attempted. */
  mean: number | null
  /** Median of attempts, or null if nobody attempted. */
  median: number | null
  min: number | null
  max: number | null
  /** Share of attempts that reached the pass threshold (0–100). Null for points-scale or no attempts. */
  passRate: number | null
  /** Tiered bucket counts. Null for points-scale activities. */
  distribution: ScoreDistribution | null
}

export interface OverviewStats {
  totalStudents: number
  /** Students with at least one non-null score across all activities. */
  assessedStudents: number
  /** Average of per-activity participation rates (0–100). */
  avgParticipation: number
  /** Mean of every non-null PERCENTAGE-scale score across all activities and students. */
  classAverage: number | null
  atRiskCount: number
}

export interface AtRiskStudent {
  studentId: string
  studentName: string | null
  studentEmail: string | null
  studentImage: string | null
  /** Percentage-scale activities where the student scored below the struggle threshold, lowest first. */
  weakAreas: { key: ActivityKey; score: number }[]
}

function pickScore(s: AssignmentSubmission, key: ActivityKey): number | null {
  const v = s[key]
  return typeof v === "number" ? v : null
}

function extractValues(roster: AssignmentSubmission[], key: ActivityKey): number[] {
  return roster
    .map((s) => pickScore(s, key))
    .filter((v): v is number => v != null)
}

function computeMean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

function computeMedian(nums: number[]): number | null {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function computeActivityStat(
  roster: AssignmentSubmission[],
  key: ActivityKey,
): ActivityStat {
  const total = roster.length
  const scale = ACTIVITY_SCALE[key]
  const values = extractValues(roster, key)
  const attempted = values.length

  // Distribution / pass rate only make sense for bounded 0–100 scores.
  const distribution: ScoreDistribution | null =
    scale === "percentage"
      ? {
          attempted,
          below: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
          mid: values.filter((v) => v >= STRUGGLE_THRESHOLD && v < PASS_THRESHOLD).length,
          pass: values.filter((v) => v >= PASS_THRESHOLD).length,
        }
      : null

  return {
    key,
    scale,
    values,
    attempted,
    participationRate: total > 0 ? (attempted / total) * 100 : 0,
    mean: computeMean(values),
    median: computeMedian(values),
    min: attempted > 0 ? Math.min(...values) : null,
    max: attempted > 0 ? Math.max(...values) : null,
    passRate:
      distribution != null && attempted > 0
        ? (distribution.pass / attempted) * 100
        : null,
    distribution,
  }
}

export function computeActivityStats(roster: AssignmentSubmission[]): ActivityStat[] {
  return ACTIVITY_KEYS.map((key) => computeActivityStat(roster, key))
}

export function computeOverview(roster: AssignmentSubmission[]): OverviewStats {
  const total = roster.length
  const activityStats = computeActivityStats(roster)
  // Class average is only defined over bounded percentage-scale scores; mixing
  // in raw point totals would be meaningless.
  const percentageScores = activityStats
    .filter((a) => a.scale === "percentage")
    .flatMap((a) => a.values)
  const assessedStudents = roster.filter((s) =>
    ACTIVITY_KEYS.some((k) => pickScore(s, k) != null),
  ).length
  const avgParticipation =
    activityStats.length > 0
      ? activityStats.reduce((sum, a) => sum + a.participationRate, 0) / activityStats.length
      : 0
  return {
    totalStudents: total,
    assessedStudents,
    avgParticipation,
    classAverage: computeMean(percentageScores),
    atRiskCount: computeAtRiskStudents(roster).length,
  }
}

export function computeAtRiskStudents(
  roster: AssignmentSubmission[],
  threshold = STRUGGLE_THRESHOLD,
): AtRiskStudent[] {
  return roster
    .map((s) => {
      const weakAreas: { key: ActivityKey; score: number }[] = []
      // Only percentage-scale activities support a meaningful "below threshold" test.
      for (const key of PERCENTAGE_KEYS) {
        const v = pickScore(s, key)
        if (v != null && v < threshold) weakAreas.push({ key, score: v })
      }
      return { submission: s, weakAreas }
    })
    .filter((entry) => entry.weakAreas.length > 0)
    .map(({ submission, weakAreas }) => ({
      studentId: submission.studentId,
      studentName: submission.studentName ?? null,
      studentEmail: submission.studentEmail ?? null,
      studentImage: submission.studentImage ?? null,
      weakAreas: weakAreas.sort((a, b) => a.score - b.score),
    }))
    .sort((a, b) => {
      // Most weak areas first; break ties by the lowest score.
      if (b.weakAreas.length !== a.weakAreas.length) {
        return b.weakAreas.length - a.weakAreas.length
      }
      const aMin = Math.min(...a.weakAreas.map((w) => w.score))
      const bMin = Math.min(...b.weakAreas.map((w) => w.score))
      return aMin - bMin
    })
}

/**
 * Statistical analysis for an assignment roster.
 *
 * Pure, presentation-agnostic functions that derive aggregate insight from a
 * list of {@link AssignmentSubmission} rows. All computations are client-side
 * friendly (no I/O) so the teacher's assignment detail page can render them
 * synchronously from the already-fetched roster.
 *
 * Score conventions (kept consistent with the Excel exports in
 * `assignmentExcel.ts` / `teacherDashboardExcel.ts`):
 *   - `null` score  → the student has not attempted that activity (renders "-")
 *   - score < 50    → "struggling" tier (red)
 *   - 50 ≤ score < 70 → "developing" tier (amber)
 *   - score ≥ 70    → "pass" / mastery tier (green)
 */

export type ActivityKey =
  | "testScore"
  | "vocabularyQuizScore"
  | "spellingGameBestScore"
  | "grammarQuizScore"
  | "grammarGameBestScore"

/** Score ≥ this value counts as a pass (mastery). Mirrors the 70 threshold in the Excel exports. */
export const PASS_THRESHOLD = 70

/** A score strictly below this marks a student as struggling in that activity. */
export const STRUGGLE_THRESHOLD = 50

/** The five assessable activities, in canonical column order. */
export const ACTIVITY_KEYS: readonly ActivityKey[] = [
  "testScore",
  "vocabularyQuizScore",
  "spellingGameBestScore",
  "grammarQuizScore",
  "grammarGameBestScore",
] as const

export type PerformanceTier = "none" | "below" | "mid" | "pass"

/** Hex fills per performance tier, reused by charts and legend. */
export const TIER_COLORS: Record<PerformanceTier, string> = {
  none: "#94a3b8", // slate-400 — no attempts
  below: "#ef4444", // red-500 — struggling
  mid: "#f59e0b", // amber-500 — developing
  pass: "#22c55e", // green-500 — mastery
}

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
  /** share of attempts that reached the pass threshold (0–100), or null if none. */
  passRate: number | null
  distribution: ScoreDistribution
}

export interface OverviewStats {
  totalStudents: number
  /** Students with at least one non-null score across all activities. */
  assessedStudents: number
  /** Average of per-activity participation rates (0–100). */
  avgParticipation: number
  /** Mean of every non-null score across all activities and students. */
  classAverage: number | null
  atRiskCount: number
}

export interface AtRiskStudent {
  studentId: string
  studentName: string | null
  studentEmail: string | null
  studentImage: string | null
  /** Activities where the student scored below the struggle threshold, lowest first. */
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
  const values = extractValues(roster, key)
  const attempted = values.length
  const distribution: ScoreDistribution = {
    attempted,
    below: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
    mid: values.filter((v) => v >= STRUGGLE_THRESHOLD && v < PASS_THRESHOLD).length,
    pass: values.filter((v) => v >= PASS_THRESHOLD).length,
  }
  return {
    key,
    values,
    attempted,
    participationRate: total > 0 ? (attempted / total) * 100 : 0,
    mean: computeMean(values),
    median: computeMedian(values),
    min: attempted > 0 ? Math.min(...values) : null,
    max: attempted > 0 ? Math.max(...values) : null,
    passRate: attempted > 0 ? (distribution.pass / attempted) * 100 : null,
    distribution,
  }
}

export function computeActivityStats(roster: AssignmentSubmission[]): ActivityStat[] {
  return ACTIVITY_KEYS.map((key) => computeActivityStat(roster, key))
}

export function computeOverview(roster: AssignmentSubmission[]): OverviewStats {
  const total = roster.length
  const activityStats = computeActivityStats(roster)
  const allScores = activityStats.flatMap((a) => a.values)
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
    classAverage: computeMean(allScores),
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
      for (const key of ACTIVITY_KEYS) {
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

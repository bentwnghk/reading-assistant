import { z } from "zod";
import { SCORE_KEYS, percentOf, type ScoreKey } from "@/utils/languageCheckTopicReport";

const str = (max: number) => z.string().trim().max(max).catch("");

export const aiInsightsSchema = z.object({
  headline: str(300),
  summary: str(1500),
  criteria: z
    .array(
      z.object({
        key: z.enum(SCORE_KEYS),
        level: z.enum(["strength", "developing", "priority"]).catch("developing"),
        finding: str(700),
        nextStep: str(500),
      }),
    )
    .catch([]),
  strengths: z.array(z.object({ title: str(120), detail: str(500) })).catch([]),
  mistakes: z
    .array(z.object({ category: str(60), title: str(160), rule: str(600), tip: str(300) }))
    .catch([]),
  priorities: z
    .array(
      z.object({
        title: str(160),
        why: str(500),
        activity: str(700),
        minutes: z.coerce.number().min(0).max(120).catch(15),
      }),
    )
    .catch([]),
  quickTips: z.array(str(300)).catch([]),
});

export type StudentTier = "support" | "developing" | "secure";

export interface StudentInsight {
  student: LanguageCheckTopicReportStudent;
  percent: number | null;
  tier: StudentTier | "unscored";
  weakest: ScoreKey | null;
}

/** Groups students by overall percentage (<40 support, 40–69 developing, 70+ secure). */
export function groupStudents(
  students: LanguageCheckTopicReportStudent[],
  max: LanguageCheckTopicReport["max"],
): StudentInsight[] {
  return students.map((student) => {
    const percent = percentOf(student.overall, max.overall);
    let weakest: ScoreKey | null = null;
    let low = Infinity;
    for (const k of SCORE_KEYS) {
      const p = max[k] > 0 ? percentOf(student[k], max[k]) : null;
      if (p !== null && p < low) {
        low = p;
        weakest = k;
      }
    }
    const tier: StudentInsight["tier"] =
      percent === null ? "unscored" : percent >= 70 ? "secure" : percent >= 40 ? "developing" : "support";
    return { student, percent, tier, weakest };
  });
}

/** Staleness: new checked essays since the saved report. */
export function newSubmissionsSince(saved: { essayCount: number }, current: number): number {
  return Math.max(0, current - saved.essayCount);
}

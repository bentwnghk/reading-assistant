import {
  LANGUAGE_ASSESSMENT_MAX,
  assessmentOverallMax,
  type LanguageAssessmentScheme,
} from "@/constants/languageCheck";

export type ScoreRow = Omit<LanguageCheckCriterionAverages, never>;

export const SCORE_KEYS = ["content", "language", "organization", "features"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function averageOf(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Per-criterion class averages (a student with no score on a criterion is skipped). */
export function summarizeScores(rows: ScoreRow[]): LanguageCheckCriterionAverages {
  return {
    content: averageOf(rows.map((r) => r.content)),
    language: averageOf(rows.map((r) => r.language)),
    organization: averageOf(rows.map((r) => r.organization)),
    features: averageOf(rows.map((r) => r.features)),
    overall: averageOf(rows.map((r) => r.overall)),
  };
}

/** Marking scheme implied by a topic's essay type. */
export function schemeOfEssayType(essayType: string | null | undefined): LanguageAssessmentScheme {
  return essayType === "js-writing" ? "js" : essayType === "tsa-writing" ? "tsa" : "hkdse";
}

export function maxMarksOf(scheme: LanguageAssessmentScheme): LanguageCheckTopicReport["max"] {
  return { ...LANGUAGE_ASSESSMENT_MAX[scheme], overall: assessmentOverallMax(scheme) };
}

export function percentOf(score: number | null, max: number): number | null {
  if (score === null || max <= 0) return null;
  return Math.round((score / max) * 100);
}

/** Overall-score band: 0 = <20%, 1 = 20–39%, 2 = 40–59%, 3 = 60–79%, 4 = 80%+. */
export function scoreBand(percent: number): 0 | 1 | 2 | 3 | 4 {
  return percent >= 80 ? 4 : percent >= 60 ? 3 : percent >= 40 ? 2 : percent >= 20 ? 1 : 0;
}

export function distributionOf(
  overalls: (number | null)[],
  max: number,
): [number, number, number, number, number] {
  const out: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const o of overalls) {
    const p = percentOf(o, max);
    if (p !== null) out[scoreBand(p)] += 1;
  }
  return out;
}

/** Tailwind tone classes for a score percentage (green ≥ 70, amber ≥ 50, red below). */
export function percentTone(percent: number | null): {
  text: string;
  bar: string;
  badge: string;
} {
  if (percent === null)
    return { text: "text-muted-foreground", bar: "bg-muted-foreground/30", badge: "bg-muted text-muted-foreground" };
  if (percent >= 70)
    return {
      text: "text-green-600 dark:text-green-400",
      bar: "bg-green-500",
      badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    };
  if (percent >= 50)
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    };
  return {
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };
}

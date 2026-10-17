import { masteryFor, type Mastery } from "@/utils/languageCheckLearnGrade";
import type {
  LearnSessionStatus,
  LearnUnitSummary,
  LearnUnitWire,
} from "@/utils/languageCheckLearnWire";

/**
 * Progress maths for a learning unit. Pure, shared by the client store (so the
 * path / player / summary agree) and by the server (which recomputes the same
 * numbers from what it stores, instead of trusting client-sent totals).
 */

interface ItemRef {
  id: string;
}

export interface PracticeProgress {
  total: number;
  completed: number;
  /** Percentage of first-attempt credit; null until every item is completed. */
  percent: number | null;
}

export interface QuizProgress {
  total: number;
  answered: number;
  correct: number;
  /** Null until every question is answered. */
  percent: number | null;
  mastery: Mastery | null;
}

export function practiceProgress(
  items: readonly ItemRef[] | null | undefined,
  results: Readonly<Record<string, { score: number; completed: boolean }>>,
): PracticeProgress {
  const list = items ?? [];
  const completed = list.filter((i) => results[i.id]?.completed).length;
  const done = list.length > 0 && completed === list.length;
  const sum = list.reduce((a, i) => a + (results[i.id]?.score ?? 0), 0);
  return {
    total: list.length,
    completed,
    percent: done ? Math.round((sum / list.length) * 100) : null,
  };
}

export function quizProgress(
  items: readonly ItemRef[] | null | undefined,
  results: Readonly<Record<string, { score: number; correct: boolean }>>,
): QuizProgress {
  const list = items ?? [];
  const answered = list.filter((i) => results[i.id]).length;
  const done = list.length > 0 && answered === list.length;
  const sum = list.reduce((a, i) => a + (results[i.id]?.score ?? 0), 0);
  const percent = done ? Math.round((sum / list.length) * 100) : null;
  return {
    total: list.length,
    answered,
    correct: list.filter((i) => results[i.id]?.correct).length,
    percent,
    mastery: percent === null ? null : masteryFor(percent),
  };
}

// ─── Unit / session roll-ups ─────────────────────────────────────────────────

export function summarizeUnit(unit: LearnUnitWire): LearnUnitSummary {
  const practice = practiceProgress(unit.practice, unit.practiceResults);
  const quiz = quizProgress(unit.quiz, unit.quizResults);
  return {
    category: unit.category,
    mistakeCount: unit.mistakeCount,
    lessonSeen: unit.lessonSeen,
    practiceCompleted: practice.completed,
    practiceTotal: practice.total,
    practicePercent: practice.percent,
    quizPercent: quiz.percent,
    quizRound: unit.quizRound,
    mastery: quiz.mastery,
  };
}

export interface SessionRollup {
  summary: LearnUnitSummary[];
  unitCount: number;
  unitsCompleted: number;
  avgQuizPercent: number | null;
  allDone: boolean;
  masteryCounts: Record<Mastery, number>;
}

/** Totals a list row / the dashboards need, derived from the units alone. */
export function rollupSession(units: readonly LearnUnitWire[]): SessionRollup {
  const summary = units.map(summarizeUnit);
  const finished = summary.filter((u) => u.quizPercent !== null);
  const masteryCounts: Record<Mastery, number> = { secure: 0, developing: 0, review: 0 };
  for (const u of finished) if (u.mastery) masteryCounts[u.mastery] += 1;
  return {
    summary,
    unitCount: units.length,
    unitsCompleted: finished.length,
    avgQuizPercent: finished.length
      ? Math.round(finished.reduce((a, u) => a + (u.quizPercent ?? 0), 0) / finished.length)
      : null,
    allDone: units.length > 0 && finished.length === units.length,
    masteryCounts,
  };
}

export function statusFor(allDone: boolean, previous: LearnSessionStatus): LearnSessionStatus {
  return allDone || previous === "completed" ? "completed" : "in_progress";
}

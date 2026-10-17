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
  /**
   * First-attempt credit over the items answered so far (0–100), null if none.
   * Unlike `percent` it is meaningful mid-way, so a display never has to turn
   * "not finished" into a misleading 0%.
   */
  percentSoFar: number | null;
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
  const attempted = list.filter((i) => results[i.id]).length;
  return {
    total: list.length,
    completed,
    percent: done ? Math.round((sum / list.length) * 100) : null,
    percentSoFar: attempted ? Math.round((sum / attempted) * 100) : null,
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

// ─── Review redaction ────────────────────────────────────────────────────────

/**
 * What a learner may re-read of a session that may still be in progress. The
 * questions and model answers of a stage are withheld until that stage is
 * finished, otherwise opening the history view would give away the practice
 * and quiz before they are done:
 *  - practice → shown once every exercise of the topic is completed;
 *  - quiz     → shown once the CURRENT round is fully answered (finished
 *    rounds are archived separately and are always shown).
 * Lessons, the learner's own mistakes and progress numbers stay visible.
 * Pure and server-side: withholding must happen before the data leaves the
 * server, not in the UI.
 */
export function redactUnitForReview(unit: LearnUnitWire): LearnUnitWire {
  const practice = practiceProgress(unit.practice, unit.practiceResults);
  const quiz = quizProgress(unit.quiz, unit.quizResults);
  const hidePractice = !!unit.practice && practice.percent === null;
  const hideQuiz = !!unit.quiz && quiz.percent === null;
  if (!hidePractice && !hideQuiz) return unit;
  return {
    ...unit,
    practice: hidePractice ? null : unit.practice,
    practiceResults: hidePractice ? {} : unit.practiceResults,
    quiz: hideQuiz ? null : unit.quiz,
    quizResults: hideQuiz ? {} : unit.quizResults,
    // Prompts of earlier rounds double as a copy of old questions.
    previousQuizPrompts: hideQuiz ? [] : unit.previousQuizPrompts,
    hidden: {
      ...(hidePractice ? { practice: { completed: practice.completed, total: practice.total } } : {}),
      ...(hideQuiz ? { quiz: { answered: quiz.answered, total: quiz.total } } : {}),
    },
  };
}

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageCheckCategory } from "@/constants/languageCheck";
import type {
  LearnErrorSample,
  LearnExercise,
  LearnLesson,
} from "@/utils/languageCheckLearn";
import type { LearnAnswer } from "@/utils/languageCheckLearnGrade";

/**
 * "Learn from your mistakes" session store — non-persisted, module scoped.
 *
 * A session is a short curriculum built from one essay's corrections: one
 * unit per selected category, each with a lesson, supported practice and a
 * quiz. All generation state lives here (never in component state) so it
 * survives SPA navigation (AGENTS Architectural Rules §A); abort controllers
 * live at module scope for the same reason. The session is mirrored to
 * `sessionStorage` (per tab, gone when the tab closes) so a reload or a
 * discarded mobile tab does not throw away material that was paid for; any
 * stage that was mid-generation is reset on rehydrate. The store is cleared
 * on sign-out / account switch via `useLanguageCheckStore.reset()`.
 */

export type LearnStage = "lesson" | "practice" | "quiz";
export type LearnStageStatus = "idle" | "loading" | "ready" | "error";

export interface LearnStageState<T> {
  status: LearnStageStatus;
  data: T | null;
  error: string | null;
}

export interface PracticeResult {
  /** Score of the FIRST attempt (0–1); retries are for learning, not scoring. */
  score: number;
  attempts: number;
  /** True once the item was answered correctly or its answer was revealed. */
  completed: boolean;
}

export interface QuizResult {
  answer: LearnAnswer;
  score: number;
  correct: boolean;
}

export interface LearnUnit {
  category: LanguageCheckCategory;
  mistakeCount: number;
  samples: LearnErrorSample[];
  lesson: LearnStageState<LearnLesson>;
  practice: LearnStageState<LearnExercise[]>;
  quiz: LearnStageState<LearnExercise[]>;
  lessonSeen: boolean;
  practiceResults: Record<string, PracticeResult>;
  quizResults: Record<string, QuizResult>;
  /** Prompts of quiz rounds already taken, so a new round never repeats them. */
  previousQuizPrompts: string[];
  quizRound: number;
}

export type LearnLocation =
  | { unit: number; stage: LearnStage }
  | "summary";

export interface LearnSession {
  key: string;
  essayId: string;
  essayTitle: string;
  age: number;
  units: LearnUnit[];
  current: LearnLocation;
}

interface LearnState {
  session: LearnSession | null;
}

interface LearnActions {
  start: (session: LearnSession) => void;
  setCurrent: (key: string, location: LearnLocation) => void;
  patchUnit: (
    key: string,
    category: string,
    patch: (unit: LearnUnit) => Partial<LearnUnit>,
  ) => void;
  markLessonSeen: (key: string, category: string) => void;
  recordPractice: (
    key: string,
    category: string,
    id: string,
    patch: (prev: PracticeResult | undefined) => PracticeResult,
  ) => void;
  recordQuiz: (key: string, category: string, id: string, result: QuizResult) => void;
  reset: () => void;
}

export const emptyStage = <T,>(): LearnStageState<T> => ({
  status: "idle",
  data: null,
  error: null,
});

export function createUnit(
  category: LanguageCheckCategory,
  mistakeCount: number,
  samples: LearnErrorSample[],
): LearnUnit {
  return {
    category,
    mistakeCount,
    samples,
    lesson: emptyStage(),
    practice: emptyStage(),
    quiz: emptyStage(),
    lessonSeen: false,
    practiceResults: {},
    quizResults: {},
    previousQuizPrompts: [],
    quizRound: 1,
  };
}

// ── Abort registry (module scope: survives component unmount) ────────────────
let controller: AbortController | null = null;

export function getLearnAbort(): AbortController {
  if (!controller || controller.signal.aborted) controller = new AbortController();
  return controller;
}

export function abortLearn(): void {
  if (controller && !controller.signal.aborted) controller.abort();
  controller = null;
}

function mapUnit(
  session: LearnSession,
  category: string,
  fn: (unit: LearnUnit) => LearnUnit,
): LearnSession {
  return {
    ...session,
    units: session.units.map((u) => (u.category === category ? fn(u) : u)),
  };
}

/** A stage that was generating when the page went away has no worker anymore. */
function settleStage<T>(stage: LearnStageState<T>): LearnStageState<T> {
  return stage.status === "loading"
    ? { status: stage.data ? "ready" : "idle", data: stage.data, error: null }
    : stage;
}

export const useLanguageCheckLearnStore = create<LearnState & LearnActions>()(
  persist(
    (set) => ({
      session: null,

      start: (session) => set({ session }),

      setCurrent: (key, current) =>
        set((s) => (s.session?.key === key ? { session: { ...s.session, current } } : {})),

      patchUnit: (key, category, patch) =>
        set((s) =>
          s.session?.key === key
            ? { session: mapUnit(s.session, category, (u) => ({ ...u, ...patch(u) })) }
            : {},
        ),

      markLessonSeen: (key, category) =>
        set((s) =>
          s.session?.key === key
            ? {
                session: mapUnit(s.session, category, (u) =>
                  u.lessonSeen ? u : { ...u, lessonSeen: true },
                ),
              }
            : {},
        ),

      recordPractice: (key, category, id, patch) =>
        set((s) =>
          s.session?.key === key
            ? {
                session: mapUnit(s.session, category, (u) => ({
                  ...u,
                  practiceResults: {
                    ...u.practiceResults,
                    [id]: patch(u.practiceResults[id]),
                  },
                })),
              }
            : {},
        ),

      recordQuiz: (key, category, id, result) =>
        set((s) =>
          s.session?.key === key
            ? {
                session: mapUnit(s.session, category, (u) => ({
                  ...u,
                  quizResults: { ...u.quizResults, [id]: result },
                })),
              }
            : {},
        ),

      reset: () => {
        abortLearn();
        set({ session: null });
        useLanguageCheckLearnStore.persist.clearStorage();
      },
    }),
    {
      name: "languageCheckLearn",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ session: state.session }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<LearnState> | undefined)?.session;
        if (!saved) return current;
        return {
          ...current,
          session: {
            ...saved,
            units: saved.units.map((u) => ({
              ...u,
              lesson: settleStage(u.lesson),
              practice: settleStage(u.practice),
              quiz: settleStage(u.quiz),
            })),
          },
        };
      },
    },
  ),
);

// ── Derived progress (pure; shared by the path, the player and the summary) ──

export function practiceDone(unit: LearnUnit): boolean {
  const items = unit.practice.data;
  return (
    !!items &&
    items.length > 0 &&
    items.every((i) => unit.practiceResults[i.id]?.completed)
  );
}

export function quizDone(unit: LearnUnit): boolean {
  const items = unit.quiz.data;
  return !!items && items.length > 0 && items.every((i) => unit.quizResults[i.id]);
}

export function unitDone(unit: LearnUnit): boolean {
  return quizDone(unit);
}

/** Percentage of practice credit earned from first attempts. */
export function practicePercent(unit: LearnUnit): number | null {
  const items = unit.practice.data;
  if (!items || items.length === 0 || !practiceDone(unit)) return null;
  const sum = items.reduce((a, i) => a + (unit.practiceResults[i.id]?.score ?? 0), 0);
  return Math.round((sum / items.length) * 100);
}

export function quizPercent(unit: LearnUnit): number | null {
  const items = unit.quiz.data;
  if (!items || items.length === 0 || !quizDone(unit)) return null;
  const sum = items.reduce((a, i) => a + (unit.quizResults[i.id]?.score ?? 0), 0);
  return Math.round((sum / items.length) * 100);
}

/** Whether a stage may be opened (lessons are always open; the rest unlock in order). */
export function stageUnlocked(unit: LearnUnit, stage: LearnStage): boolean {
  if (stage === "lesson") return true;
  if (stage === "practice") return unit.lessonSeen;
  return practiceDone(unit);
}

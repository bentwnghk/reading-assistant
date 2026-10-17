"use client";

import i18next from "i18next";
import { toast } from "sonner";
import {
  LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
  isExpressionCategory,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import {
  learnEvaluatePrompt,
  learnExercisePlan,
  learnExercisesPrompt,
  learnLessonPrompt,
  learnSystemPrompt,
} from "@/constants/readingPrompts";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  createUnit,
  getLearnAbort,
  abortLearn,
  useLanguageCheckLearnStore,
  type LearnUnit,
} from "@/store/languageCheckLearn";
import { useSettingStore } from "@/store/setting";
import { parseError } from "@/utils/error";
import { stripJsonFences } from "@/utils/languageCheck";
import {
  buildErrorSamples,
  countByCategory,
  parseExercises,
  parseLesson,
  type LearnExercise,
} from "@/utils/languageCheckLearn";
import {
  exercisePrompt,
  type Grade,
} from "@/utils/languageCheckLearnGrade";

/** Fewest usable exercises a stage needs before it is shown. */
const MIN_EXERCISES = 3;
/** Max earlier prompts passed to the model so it does not repeat them. */
const MAX_AVOID = 24;

export type OpenVerdict = "correct" | "partial" | "incorrect";

export interface OpenEvaluation {
  verdict: OpenVerdict;
  feedback: string;
  feedbackZh: string;
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

/** "subject-verb-agreement" → "subject verb agreement" (prompt label). */
function promptLabel(category: string): string {
  return category.replace(/-/g, " ");
}

function clip(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * AI actions for "Learn from your mistakes". All state lives in
 * `useLanguageCheckLearnStore`, so a unit keeps generating after the learner
 * navigates away and is still there when they come back (AGENTS §A).
 *
 * Content is generated progressively: the first lesson is requested when the
 * session starts, and each finished stage kicks off the next one in the
 * background (lesson → practice → quiz, plus the NEXT unit's lesson only), so
 * the learner rarely waits without generating a whole session they may never
 * finish. A prefetched lesson warms its own practice set once it is opened.
 */
export default function useLanguageCheckLearn() {
  const { generate } = useLanguageCheck();
  const store = () => useLanguageCheckLearnStore.getState();

  function unitOf(key: string, category: string): LearnUnit | undefined {
    const s = store().session;
    return s?.key === key ? s.units.find((u) => u.category === category) : undefined;
  }

  function ageOf(key: string): number {
    return store().session?.key === key ? store().session!.age : 15;
  }

  async function generateJson(prompt: string, signal: AbortSignal): Promise<unknown> {
    const { languageCheckModel } = useSettingStore.getState();
    const text = await generate(languageCheckModel, learnSystemPrompt(), prompt, signal);
    return JSON.parse(stripJsonFences(text));
  }

  /** Runs `job`, mapping its outcome onto the stage state of one unit. */
  async function runStage(
    key: string,
    category: string,
    stage: "lesson" | "practice" | "quiz",
    job: (signal: AbortSignal) => Promise<void>,
    errorKey: string,
    keepData = false,
  ): Promise<boolean> {
    const ac = getLearnAbort();
    store().patchUnit(key, category, (u) => ({
      [stage]: { status: "loading", data: keepData ? u[stage].data : null, error: null },
    }));
    try {
      await job(ac.signal);
      return true;
    } catch (error) {
      const aborted = isAbort(error) || ac.signal.aborted;
      if (!aborted) console.error(`Language check learn (${stage}) failed:`, error);
      store().patchUnit(key, category, (u) => ({
        [stage]: aborted
          ? { status: u[stage].data ? "ready" : "idle", data: u[stage].data, error: null }
          : {
              status: u[stage].data && keepData ? "ready" : "error",
              data: u[stage].data,
              error: i18next.t(errorKey, { defaultValue: parseError(error) }),
            },
      }));
      return false;
    }
  }

  // ── Lesson ────────────────────────────────────────────────────────────────

  async function ensureLesson(
    key: string,
    category: string,
    opts: { prefetch?: boolean } = {},
  ): Promise<void> {
    const unit = unitOf(key, category);
    if (!unit || unit.lesson.status === "loading" || unit.lesson.status === "ready") return;
    const age = ageOf(key);

    const ok = await runStage(
      key,
      category,
      "lesson",
      async (signal) => {
        const prompt = learnLessonPrompt({
          category: category as LanguageCheckCategory,
          categoryLabel: promptLabel(category),
          age,
          samples: unit.samples,
          mistakeCount: unit.mistakeCount,
        });
        let lesson;
        try {
          lesson = parseLesson(await generateJson(prompt, signal));
        } catch (first) {
          if (signal.aborted || isAbort(first)) throw first;
          lesson = parseLesson(await generateJson(prompt, signal));
        }
        store().patchUnit(key, category, () => ({
          lesson: { status: "ready", data: lesson, error: null },
        }));
      },
      "languageCheck.learn.errors.lesson",
    );
    // Warm up the practice set while the learner reads (not for a lesson that
    // was only prefetched — that happens when the learner opens it).
    if (ok && !opts.prefetch) void ensurePractice(key, category);
  }

  // ── Practice ──────────────────────────────────────────────────────────────

  async function requestExercises(
    key: string,
    unit: LearnUnit,
    phase: "practice" | "quiz",
    idPrefix: string,
    avoid: string[],
    signal: AbortSignal,
  ): Promise<LearnExercise[]> {
    const age = ageOf(key);
    const category = unit.category;
    const plan = learnExercisePlan({ category, phase, age });
    const lesson = unit.lesson.data;
    const prompt = learnExercisesPrompt({
      category,
      categoryLabel: promptLabel(category),
      phase,
      age,
      count: plan.count,
      types: plan.types,
      samples: unit.samples,
      lessonSummary: lesson?.summary ?? "",
      rules: (lesson?.rules ?? []).map((r) => `${r.heading}: ${r.explanation}`),
      avoid: avoid.slice(-MAX_AVOID),
    });

    let best: LearnExercise[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { items } = parseExercises(await generateJson(prompt, signal), {
          idPrefix,
          allowed: plan.types,
          max: plan.count,
        });
        if (items.length > best.length) best = items;
      } catch (error) {
        if (signal.aborted || isAbort(error)) throw error;
        if (attempt === 1 && best.length === 0) throw error;
      }
      if (best.length >= Math.ceil(plan.count * 0.7)) break;
    }
    if (best.length < MIN_EXERCISES) {
      throw new Error(i18next.t("languageCheck.learn.errors.exercises"));
    }
    return best;
  }

  /** `more` appends a fresh set after the learner finished the first one. */
  async function ensurePractice(
    key: string,
    category: string,
    opts: { more?: boolean } = {},
  ): Promise<void> {
    const unit = unitOf(key, category);
    if (!unit || unit.practice.status === "loading") return;
    if (!opts.more && unit.practice.status === "ready") return;

    const existing = unit.practice.data ?? [];
    const ok = await runStage(
      key,
      category,
      "practice",
      async (signal) => {
        const fresh = unitOf(key, category) ?? unit;
        const items = await requestExercises(
          key,
          fresh,
          "practice",
          `p${existing.length}`,
          existing.map((e) => clip(exercisePrompt(e))),
          signal,
        );
        store().patchUnit(key, category, () => ({
          practice: {
            status: "ready",
            data: opts.more ? [...existing, ...items] : items,
            error: null,
          },
        }));
      },
      "languageCheck.learn.errors.exercises",
      !!opts.more,
    );
    if (ok && !opts.more) {
      void ensureQuiz(key, category);
      prefetchNextLesson(key, category);
    }
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────

  /** `retake` starts a new round with questions that differ from earlier ones. */
  async function ensureQuiz(
    key: string,
    category: string,
    opts: { retake?: boolean } = {},
  ): Promise<void> {
    const unit = unitOf(key, category);
    if (!unit || unit.quiz.status === "loading") return;
    if (!opts.retake && unit.quiz.status === "ready") return;

    const seen = [
      ...unit.previousQuizPrompts,
      ...(opts.retake ? (unit.quiz.data ?? []).map((e) => clip(exercisePrompt(e))) : []),
    ];
    const practiceSeen = (unit.practice.data ?? []).map((e) => clip(exercisePrompt(e)));
    const round = opts.retake ? unit.quizRound + 1 : unit.quizRound;

    if (opts.retake) {
      store().patchUnit(key, category, () => ({
        quizResults: {},
        quizRound: round,
        previousQuizPrompts: seen,
        quiz: { status: "loading", data: null, error: null },
      }));
    }

    await runStage(
      key,
      category,
      "quiz",
      async (signal) => {
        const fresh = unitOf(key, category) ?? unit;
        const items = await requestExercises(
          key,
          fresh,
          "quiz",
          `q${round}`,
          [...practiceSeen, ...seen],
          signal,
        );
        store().patchUnit(key, category, () => ({
          quiz: { status: "ready", data: items, error: null },
        }));
      },
      "languageCheck.learn.errors.exercises",
    );
  }

  function prefetchNextLesson(key: string, category: string): void {
    const session = store().session;
    if (!session || session.key !== key) return;
    const i = session.units.findIndex((u) => u.category === category);
    const next = session.units[i + 1];
    if (next) void ensureLesson(key, next.category, { prefetch: true });
  }

  // ── Open answers (rewrite / compose) ──────────────────────────────────────

  /** Asks the model to judge an answer string comparison cannot. Null on failure. */
  async function evaluateOpen(
    key: string,
    category: string,
    item: Extract<LearnExercise, { type: "rewrite" | "compose" }>,
    studentAnswer: string,
  ): Promise<OpenEvaluation | null> {
    const { languageCheckModel } = useSettingStore.getState();
    const ac = getLearnAbort();
    try {
      const prompt = learnEvaluatePrompt({
        type: item.type,
        age: ageOf(key),
        categoryLabel: promptLabel(category),
        instruction: item.instruction,
        source: item.type === "rewrite" ? item.source : "",
        criteria: item.criteria,
        accepted: item.type === "rewrite" ? item.answers : [item.modelAnswer],
        studentAnswer,
      });
      const text = await generate(languageCheckModel, learnSystemPrompt(), prompt, ac.signal);
      const json = JSON.parse(stripJsonFences(text)) as Partial<OpenEvaluation>;
      const verdict: OpenVerdict =
        json.verdict === "correct" || json.verdict === "partial" ? json.verdict : "incorrect";
      return {
        verdict,
        feedback: String(json.feedback ?? ""),
        feedbackZh: String(json.feedbackZh ?? ""),
      };
    } catch (error) {
      if (!isAbort(error)) {
        console.error("Language check learn evaluation failed:", error);
        toast.error(i18next.t("languageCheck.learn.errors.evaluate"));
      }
      return null;
    }
  }

  // ── Session ───────────────────────────────────────────────────────────────

  /**
   * Starts (or resumes) a learning session for the chosen categories. An
   * identical selection for the same essay and level keeps its progress.
   * Returns the session key.
   */
  function begin(
    essay: Pick<LanguageCheckEssay, "id" | "title" | "checkedText" | "corrections">,
    categories: LanguageCheckCategory[],
    age: number,
  ): string {
    const counts = countByCategory(essay.corrections);
    const chosen = counts
      .filter((c) => categories.includes(c.category))
      // Errors before suggestions, then most frequent first.
      .sort(
        (a, b) =>
          Number(isExpressionCategory(a.category)) - Number(isExpressionCategory(b.category)) ||
          b.count - a.count,
      )
      .slice(0, LANGUAGE_CHECK_LEARN_MAX_CATEGORIES);
    const key = `${essay.id}|${chosen.map((c) => c.category).join(",")}|${age}`;

    const existing = store().session;
    if (existing?.key === key) return key;

    abortLearn();
    store().start({
      key,
      essayId: essay.id,
      essayTitle: essay.title,
      age,
      units: chosen.map((c) =>
        createUnit(c.category, c.count, buildErrorSamples(essay, c.category)),
      ),
      current: { unit: 0, stage: "lesson" },
    });
    if (chosen[0]) void ensureLesson(key, chosen[0].category);
    return key;
  }

  return {
    begin,
    ensureLesson,
    ensurePractice,
    ensureQuiz,
    evaluateOpen,
  };
}

export type { Grade };

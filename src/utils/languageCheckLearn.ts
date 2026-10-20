import { z } from "zod";
import {
  LANGUAGE_CHECK_CATEGORIES,
  LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
  LEARN_EXERCISE_TYPES,
  LEARN_STRICT_CATEGORIES,
  isExpressionCategory,
  type LanguageCheckCategory,
  type LearnExerciseType,
} from "@/constants/languageCheck";
import { contextAround, diffChanges, tokenize, wordDiff } from "@/utils/languageCheck";

/**
 * Pure logic for "Learn from your mistakes": AI response schemas (parsed
 * leniently, item by item), level helpers and the learner's-own-mistakes
 * context. Grading lives in `languageCheckLearnGrade.ts`. No React, no network.
 */

// ─── Small helpers ───────────────────────────────────────────────────────────

const text = (fallback = "") => z.string().trim().default(fallback);

/** Keeps the items of an array that individually satisfy `schema`. */
function lenientArray<T extends z.ZodTypeAny>(schema: T, max: number) {
  return z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => schema.safeParse(x).success) : []),
    z.array(schema).max(max),
  );
}

/** Accepts a lone string where a string list is expected. */
const stringList = z.preprocess(
  (v) =>
    typeof v === "string"
      ? [v]
      : Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string")
        : [],
  z.array(z.string().trim()),
);

export function isCategory(value: string): value is LanguageCheckCategory {
  return (LANGUAGE_CHECK_CATEGORIES as readonly string[]).includes(value);
}

/** Capitalisation / punctuation: letter case and marks ARE the skill. */
export function isStrictCategory(category: string): boolean {
  return (LEARN_STRICT_CATEGORIES as readonly string[]).includes(category);
}

export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Level helpers ───────────────────────────────────────────────────────────

/** Locale key under `reading.levels` for a learner age (8–18). */
export function levelKeyForAge(age: number): string {
  const map: Record<number, string> = {
    8: "primary3",
    9: "primary4",
    10: "primary5",
    11: "primary6",
    12: "form1",
    13: "form2",
    14: "form3",
    15: "form4",
    16: "form5",
    17: "form6",
    18: "dse",
  };
  return map[Math.min(18, Math.max(8, Math.round(age)))] ?? "form4";
}

/** Exercises per phase, shortened for younger learners. */
export function practiceSizeForAge(age: number): number {
  return age <= 9 ? 6 : 8;
}
export function quizSizeForAge(age: number): number {
  return age <= 9 ? 5 : 6;
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

const ruleSchema = z.object({
  heading: text(),
  headingZh: text(),
  explanation: text(),
  explanationZh: text(),
  pattern: text(),
  examples: lenientArray(z.string().trim().min(1), 4),
});

const contrastSchema = z.object({
  wrong: z.string().trim().min(1),
  right: z.string().trim().min(1),
  why: text(),
  whyZh: text(),
});

const tipSchema = z.object({
  tip: z.string().trim().min(1),
  tipZh: text(),
});

export const lessonSchema = z.object({
  title: text(),
  titleZh: text(),
  summary: z.string().trim().min(1),
  summaryZh: text(),
  whyItMatters: text(),
  whyItMattersZh: text(),
  rules: lenientArray(ruleSchema, 6).pipe(z.array(ruleSchema).min(1)),
  contrasts: lenientArray(contrastSchema, 6),
  chineseTransfer: z
    .object({ explanation: text(), explanationZh: text() })
    .nullish()
    .transform((v) => (v && (v.explanation || v.explanationZh) ? v : null)),
  tips: lenientArray(tipSchema, 5),
});

export type LearnLesson = z.output<typeof lessonSchema>;

export function parseLesson(json: unknown): LearnLesson {
  return lessonSchema.parse(json);
}

// ─── Exercises ───────────────────────────────────────────────────────────────

const feedbackFields = {
  hint: text(),
  explanation: text(),
  explanationZh: text(),
};

const choiceSchema = z
  .object({
    type: z.literal("choice"),
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(5),
    answer: z.string().trim().min(1),
    ...feedbackFields,
  })
  .refine((i) => new Set(i.options).size === i.options.length, "duplicate options")
  .refine((i) => i.options.includes(i.answer), "answer is not an option")
  .transform((i) => ({ ...i, options: shuffled(i.options) }));

const BLANK_RE = /_{2,}/g;

export function countBlanks(sentence: string): number {
  return sentence.match(BLANK_RE)?.length ?? 0;
}

/** Text around each blank: `n` blanks give `n + 1` parts. */
export function splitAtBlanks(sentence: string): string[] {
  return sentence.split(BLANK_RE);
}

const fillBlankSchema = z
  .object({
    type: z.literal("fill-blank"),
    sentence: z.string().trim().min(1),
    answers: z.array(z.union([z.string(), z.array(z.string())])).min(1),
    ...feedbackFields,
  })
  .transform((i, ctx) => {
    const blanks = countBlanks(i.sentence);
    const everyString = i.answers.every((a) => typeof a === "string");
    // One blank + a flat list of strings means "alternatives for that blank".
    let answers: string[][] =
      blanks === 1 && everyString && i.answers.length > 1
        ? [i.answers as string[]]
        : i.answers.map((a) => (Array.isArray(a) ? a : [a]));
    answers = answers.map((a) => a.map((x) => x.trim()).filter(Boolean));
    if (blanks < 1 || answers.length !== blanks || answers.some((a) => a.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "blanks/answers mismatch" });
      return z.NEVER;
    }
    return { ...i, answers };
  });

const reorderSchema = z
  .object({
    type: z.literal("reorder"),
    context: text(),
    answer: z.string().trim().min(1),
    alternatives: stringList.default([]),
    ...feedbackFields,
  })
  .transform((i, ctx) => {
    const words = i.answer.split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bad length" });
      return z.NEVER;
    }
    let tokens = shuffled(words);
    for (let n = 0; n < 5 && tokens.join(" ") === words.join(" "); n++) {
      tokens = shuffled(words);
    }
    return { ...i, tokens };
  });

const findFixErrorSchema = z.object({
  wrong: z.string().min(1),
  right: stringList,
  explanation: text(),
  explanationZh: text(),
});

export interface PassageError {
  start: number;
  end: number;
  wrong: string;
  /** Accepted replacements for exactly `wrong` ("" means delete). */
  right: string[];
  explanation: string;
  explanationZh: string;
}

/** Anchors each `wrong` snippet in the passage (like resolveErrors does for essays). */
function anchorPassageErrors(
  passage: string,
  raw: z.output<typeof findFixErrorSchema>[],
): PassageError[] {
  const out: PassageError[] = [];
  for (const e of raw) {
    const wrong = e.wrong.trim();
    const right = [...new Set(e.right)];
    if (!wrong || right.length === 0 || right.includes(wrong)) continue;
    let start = -1;
    for (const ignoreCase of [false, true]) {
      const hay = ignoreCase ? passage.toLowerCase() : passage;
      const needle = ignoreCase ? wrong.toLowerCase() : wrong;
      let from = 0;
      for (;;) {
        const i = hay.indexOf(needle, from);
        if (i === -1) break;
        if (!out.some((o) => i < o.end && i + wrong.length > o.start)) {
          start = i;
          break;
        }
        from = i + 1;
      }
      if (start !== -1) break;
    }
    if (start === -1) continue;
    out.push({
      start,
      end: start + wrong.length,
      wrong: passage.slice(start, start + wrong.length),
      right,
      explanation: e.explanation,
      explanationZh: e.explanationZh,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

function findFixSchema<T extends "error-correction" | "proofread">(
  type: T,
  maxErrors: number,
) {
  return z
    .object({
      type: z.literal(type),
      passage: z.string().trim().min(3),
      errors: z.array(z.unknown()).min(1),
      ...feedbackFields,
    })
    .transform((i, ctx): Omit<typeof i, "errors"> & { errors: PassageError[] } => {
      const parsed = i.errors.flatMap((e) => {
        const r = findFixErrorSchema.safeParse(e);
        return r.success ? [r.data] : [];
      });
      const errors = anchorPassageErrors(i.passage, parsed).slice(0, maxErrors);
      if (errors.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "no anchorable errors" });
        return z.NEVER;
      }
      return { ...i, errors };
    });
}

const rewriteSchema = z.object({
  type: z.literal("rewrite"),
  instruction: z.string().trim().min(1),
  source: text(),
  answers: stringList.pipe(z.array(z.string().min(1)).min(1)),
  criteria: text(),
  ...feedbackFields,
});

const composeSchema = z.object({
  type: z.literal("compose"),
  instruction: z.string().trim().min(1),
  criteria: z.string().trim().min(1),
  modelAnswer: z.string().trim().min(1),
  ...feedbackFields,
});

const exerciseSchemas = {
  choice: choiceSchema,
  "fill-blank": fillBlankSchema,
  reorder: reorderSchema,
  "error-correction": findFixSchema("error-correction", 1),
  proofread: findFixSchema("proofread", 5),
  rewrite: rewriteSchema,
  compose: composeSchema,
} as const;

type ExerciseByType = {
  [K in LearnExerciseType]: z.output<(typeof exerciseSchemas)[K]>;
};

export type LearnExercise = {
  [K in LearnExerciseType]: ExerciseByType[K] & { id: string };
}[LearnExerciseType];

export type ChoiceExercise = ExerciseByType["choice"] & { id: string };
export type FillBlankExercise = ExerciseByType["fill-blank"] & { id: string };
export type ReorderExercise = ExerciseByType["reorder"] & { id: string };
export type FindFixExercise = (
  | ExerciseByType["error-correction"]
  | ExerciseByType["proofread"]
) & { id: string };
export type RewriteExercise = ExerciseByType["rewrite"] & { id: string };
export type ComposeExercise = ExerciseByType["compose"] & { id: string };

export interface ParsedExercises {
  items: LearnExercise[];
  dropped: number;
}

/**
 * Parses the model output. Invalid items are skipped individually so one bad
 * exercise never discards the set. `allowed` also filters out formats the
 * phase must not contain (e.g. open composition in a quiz).
 */
export function parseExercises(
  json: unknown,
  opts: { idPrefix: string; allowed: readonly LearnExerciseType[]; max: number },
): ParsedExercises {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { exercises?: unknown }).exercises)
      ? (json as { exercises: unknown[] }).exercises
      : null;
  if (!list) throw new Error("Response is not an exercise list");

  const items: LearnExercise[] = [];
  let dropped = 0;
  for (const raw of list) {
    const type =
      raw && typeof raw === "object" ? (raw as { type?: unknown }).type : undefined;
    if (
      typeof type !== "string" ||
      !(LEARN_EXERCISE_TYPES as readonly string[]).includes(type) ||
      !opts.allowed.includes(type as LearnExerciseType)
    ) {
      dropped += 1;
      continue;
    }
    const parsed = exerciseSchemas[type as LearnExerciseType].safeParse(raw);
    if (!parsed.success || items.length >= opts.max) {
      dropped += 1;
      continue;
    }
    items.push({
      ...parsed.data,
      id: `${opts.idPrefix}-${items.length + 1}`,
    } as LearnExercise);
  }
  return { items, dropped };
}

/** Locale key suffix under `languageCheck.learn.exercise.types` for an exercise format. */
export function exerciseTypeKey(type: LearnExerciseType): string {
  switch (type) {
    case "fill-blank":
      return "fillBlank";
    case "error-correction":
      return "errorCorrection";
    default:
      return type;
  }
}

/** Locale key suffix under `...exercise.instructions` ("" = the prompt itself says what to do). */
export function exerciseInstructionKey(item: LearnExercise): string {
  switch (item.type) {
    case "choice":
    case "reorder":
    case "proofread":
      return item.type;
    case "fill-blank":
      return "fillBlank";
    case "error-correction":
      return "errorCorrection";
    case "rewrite":
    case "compose":
      return "";
  }
}

// ─── Learner's own mistakes (prompt context + lesson display) ────────────────

export interface LearnErrorSample {
  original: string;
  correction: string;
  explanation: string;
  /** The learner's sentence around the error. */
  sentence: string;
  /**
   * Where the mistake starts inside `sentence` (index of `original`). Absent
   * in sessions stored before this field existed — `underlineMistake` then
   * locates the text instead.
   */
  matchStart?: number;
}

/** Up to `max` distinct mistakes of one category, in reading order. */
export function buildErrorSamples(
  essay: Pick<LanguageCheckEssay, "checkedText" | "corrections">,
  category: string,
  max = 5,
): LearnErrorSample[] {
  const seen = new Set<string>();
  const out: LearnErrorSample[] = [];
  for (const e of essay.corrections) {
    if (e.category !== category) continue;
    const key = `${e.original.toLowerCase()}→${e.correction.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ctx = contextAround(essay.checkedText, e.start, e.end, 90);
    const sentence = `${ctx.before}${ctx.match}${ctx.after}`.trim();
    out.push({
      original: e.original,
      correction: e.correction,
      explanation: e.explanation || e.explanationZh,
      sentence,
      // `before` is left-trimmed (or "…"-prefixed), so the sentence's own
      // leading trim — if any — never shifts the match: it starts at
      // before.length, or at 0 when there is no before.
      matchStart: ctx.before.length,
    });
    if (out.length >= max) break;
  }
  return out;
}

export type MistakeMark =
  | { kind: "underline"; before: string; mistake: string; after: string }
  | { kind: "insert"; before: string; after: string; missing: string };

/**
 * Where the mistake sits inside a sample's quoted sentence, so both the
 * on-screen lesson and the Word export can mark the exact spot:
 *
 * - The student wrote something wrong → `underline` splits the sentence around
 *   the wrong words (rendered with a red wavy underline).
 * - The student left something out — the correction only ADDS words to what
 *   they wrote, a pure insertion — → `insert` splits the sentence at the gap
 *   where the missing words belong (rendered with a red ^). The anchor words
 *   around the gap are NOT the mistake, so they are never underlined.
 *
 * The position prefers the recorded `matchStart` (sessions stored before that
 * field existed do not have it) and falls back to locating the original text,
 * verbatim first, then trimmed / case-insensitive. Null when the mistake
 * cannot be found in the sentence (nothing is marked then). For multiple
 * insertion gaps in one correction the FIRST gap is marked.
 */
export function mistakeMark(
  sample: Pick<
    LearnErrorSample,
    "sentence" | "original" | "correction" | "matchStart"
  >,
): MistakeMark | null {
  const { sentence, original, correction } = sample;
  if (!sentence || !original.trim()) return null;

  const start = locateOriginal(sample);
  if (start < 0) return null;
  const end = start + original.length;

  const changes = diffChanges(original, correction);
  const isInsertion =
    changes.length > 0 && changes.every((c) => !c.removed && !!c.added);

  if (!isInsertion) {
    return {
      kind: "underline",
      before: sentence.slice(0, start),
      mistake: sentence.slice(start, end),
      after: sentence.slice(end),
    };
  }

  // How many of the student's own words stand before the first inserted run.
  let sameBefore = 0;
  for (const token of wordDiff(original, correction)) {
    if (token.type === "added") break;
    // A pure insertion has no "removed" tokens, so everything else is "same".
    sameBefore += 1;
  }
  // Map those words onto a character offset inside the original span…
  let at = start;
  for (const word of tokenize(original).slice(0, sameBefore)) {
    const found = sentence.indexOf(word, at);
    if (found < 0 || found + word.length > end) return null;
    at = found + word.length;
  }
  // …then sit the caret at the left edge of whatever follows, so it reads as
  // its own token ("feedback ^ seriously", not "feedback^ seriously").
  while (at < end && /\s/.test(sentence[at])) at += 1;

  return {
    kind: "insert",
    before: sentence.slice(0, at),
    after: sentence.slice(at),
    missing: changes[0].added,
  };
}

/**
 * Index of the original span inside the sentence: the recorded `matchStart`
 * when it really points at the original text, else the first verbatim
 * occurrence, else the first trimmed / case-insensitive one. -1 when the
 * sentence does not contain the mistake.
 */
function locateOriginal(
  sample: Pick<LearnErrorSample, "sentence" | "original" | "matchStart">,
): number {
  const { sentence, original } = sample;
  const start = sample.matchStart;
  if (
    typeof start === "number" &&
    Number.isInteger(start) &&
    sentence.slice(start, start + original.length) === original
  ) {
    return start;
  }
  const verbatim = sentence.indexOf(original);
  if (verbatim >= 0) return verbatim;
  return sentence.toLowerCase().indexOf(original.trim().toLowerCase());
}

/** Category → number of corrections, most frequent first (stable by taxonomy order). */
export function countByCategory(
  corrections: readonly LanguageCheckError[],
): { category: LanguageCheckCategory; count: number }[] {
  const map = new Map<string, number>();
  for (const c of corrections) map.set(c.category, (map.get(c.category) ?? 0) + 1);
  return LANGUAGE_CHECK_CATEGORIES.filter((c) => map.has(c))
    .map((category) => ({ category, count: map.get(category) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export interface LearnUnitPlan {
  category: LanguageCheckCategory;
  count: number;
  samples: LearnErrorSample[];
}

/**
 * The units of a learning session for the chosen categories: errors before
 * suggestions, most frequent first, capped. Used by the browser to start a
 * session and by the server to build the authoritative copy from the stored
 * essay, so both always agree. `key` identifies the selection (essay +
 * categories + level); the same selection resumes an unfinished session.
 */
export function planLearnUnits(
  essay: Pick<LanguageCheckEssay, "id" | "checkedText" | "corrections">,
  categories: readonly string[],
  age: number,
): { key: string; units: LearnUnitPlan[] } {
  const units = countByCategory(essay.corrections)
    .filter((c) => categories.includes(c.category))
    .sort(
      (a, b) =>
        Number(isExpressionCategory(a.category)) - Number(isExpressionCategory(b.category)) ||
        b.count - a.count,
    )
    .slice(0, LANGUAGE_CHECK_LEARN_MAX_CATEGORIES)
    .map((c) => ({
      category: c.category,
      count: c.count,
      samples: buildErrorSamples(essay, c.category),
    }));
  return { key: `${essay.id}|${units.map((u) => u.category).join(",")}|${age}`, units };
}

/** Where a learning session lives; the id is the database id, so it opens on any device. */
export function learnUrl(id: string): string {
  return `/language-check/learn?session=${encodeURIComponent(id)}`;
}

// ─── Display ─────────────────────────────────────────────────────────────────

/** Text in the learner's explanation language, falling back to the other one. */
export function pickLang(en: string, zh: string, lang: "en" | "zh"): string {
  const primary = (lang === "zh" ? zh : en).trim();
  return primary || (lang === "zh" ? en : zh).trim();
}

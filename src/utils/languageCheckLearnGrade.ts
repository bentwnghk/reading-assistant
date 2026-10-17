import {
  LANGUAGE_CHECK_LEARN_MASTERY_DEVELOPING,
  LANGUAGE_CHECK_LEARN_MASTERY_SECURE,
} from "@/constants/languageCheck";
import {
  splitAtBlanks,
  type ChoiceExercise,
  type FillBlankExercise,
  type FindFixExercise,
  type LearnExercise,
  type ReorderExercise,
  type RewriteExercise,
} from "@/utils/languageCheckLearn";

/**
 * Deterministic grading for the learning exercises. Everything here is a pure
 * function: the AI is only consulted for open answers (rewrite / compose),
 * which cannot be matched by string comparison.
 */

// ─── Normalisation ───────────────────────────────────────────────────────────

/**
 * Normalises an answer for comparison. Unless `strict`, case and final
 * sentence punctuation are ignored; spacing and curly quotes always are.
 */
export function normalizeAnswer(value: string, strict = false): string {
  let out = value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (!strict) out = out.toLowerCase().replace(/[.!?]+$/, "").trim();
  return out;
}

export function matchesAny(
  answer: string,
  accepted: readonly string[],
  strict = false,
): boolean {
  const norm = normalizeAnswer(answer, strict);
  if (!norm) return false;
  return accepted.some((a) => normalizeAnswer(a, strict) === norm);
}

// ─── Grades ──────────────────────────────────────────────────────────────────

export interface FillBlankDetail {
  kind: "fill-blank";
  blanks: boolean[];
}

export interface FindFixDetail {
  kind: "find-fix";
  errors: { detected: boolean; fixed: boolean }[];
  /** First-token index of each marked run that matched no planted error. */
  falseRuns: number[];
}

export interface Grade {
  /** 0–1; partial credit for multi-part items. */
  score: number;
  correct: boolean;
  detail?: FillBlankDetail | FindFixDetail;
}

export function gradeChoice(item: ChoiceExercise, picked: string): Grade {
  const correct = picked === item.answer;
  return { score: correct ? 1 : 0, correct };
}

export function gradeFillBlank(
  item: FillBlankExercise,
  values: readonly string[],
  strict = false,
): Grade {
  const blanks = item.answers.map((accepted, i) =>
    matchesAny(values[i] ?? "", accepted, strict),
  );
  const right = blanks.filter(Boolean).length;
  return {
    score: right / blanks.length,
    correct: right === blanks.length,
    detail: { kind: "fill-blank", blanks },
  };
}

export function gradeReorder(
  item: ReorderExercise,
  ordered: readonly string[],
  strict = false,
): Grade {
  const correct = matchesAny(ordered.join(" "), [item.answer, ...item.alternatives], strict);
  return { score: correct ? 1 : 0, correct };
}

/** Local grade for a rewrite; null when the answer needs the AI to judge it. */
export function gradeRewriteLocally(
  item: RewriteExercise,
  answer: string,
  strict = false,
): Grade | null {
  return matchesAny(answer, item.answers, strict) ? { score: 1, correct: true } : null;
}

// ─── Proofreading (find + fix) ───────────────────────────────────────────────

export interface PassageToken {
  index: number;
  text: string;
  start: number;
  end: number;
}

/** Words (keeping apostrophes/hyphens) and single punctuation marks. */
const TOKEN_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;

export function tokenizePassage(passage: string): PassageToken[] {
  const tokens: PassageToken[] = [];
  for (const m of passage.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    tokens.push({ index: tokens.length, text: m[0], start, end: start + m[0].length });
  }
  return tokens;
}

export interface MarkedRun {
  /** Token indexes of the run, inclusive. */
  first: number;
  last: number;
  /** Character range in the passage. */
  start: number;
  end: number;
  text: string;
}

/** Groups tapped tokens into runs of adjacent tokens; each run is one suspected error. */
export function runsFromMarks(
  passage: string,
  tokens: readonly PassageToken[],
  marked: Iterable<number>,
): MarkedRun[] {
  const sorted = [...new Set(marked)]
    .filter((i) => i >= 0 && i < tokens.length)
    .sort((a, b) => a - b);
  const runs: MarkedRun[] = [];
  for (const i of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.last === i - 1) {
      last.last = i;
      last.end = tokens[i].end;
    } else {
      runs.push({ first: i, last: i, start: tokens[i].start, end: tokens[i].end, text: "" });
    }
  }
  for (const r of runs) r.text = passage.slice(r.start, r.end);
  return runs;
}

/**
 * Grades a proofreading answer. An error counts as *detected* when a marked
 * run overlaps it and as *fixed* when the learner's replacement turns the
 * surrounding text into one of the accepted corrections (compared over the
 * union of the run and the error span, so marking only part of a multi-word
 * error and typing the matching edit still counts). Marked runs that overlap
 * no planted error are false alarms.
 *
 * score = (0.4 per detection + 0.6 per fix) / errors − 0.1 per false alarm,
 * clamped to [0, 1]; `correct` needs every fix and no false alarm.
 */
export function gradeFindFix(
  item: FindFixExercise,
  marked: readonly number[],
  fixes: Readonly<Record<number, string>>,
  strict = false,
): Grade {
  const { passage, errors } = item;
  const runs = runsFromMarks(passage, tokenizePassage(passage), marked);
  const used = new Set<number>();

  const results = errors.map((err) => {
    const hit = runs.find((r) => r.start < err.end && r.end > err.start);
    if (!hit) return { detected: false, fixed: false };
    used.add(hit.first);
    const from = Math.min(hit.start, err.start);
    const to = Math.max(hit.end, err.end);
    const typed = fixes[hit.first] ?? hit.text;
    const learner = passage.slice(from, hit.start) + typed + passage.slice(hit.end, to);
    const fixed = err.right.some(
      (r) =>
        normalizeAnswer(passage.slice(from, err.start) + r + passage.slice(err.end, to), strict) ===
        normalizeAnswer(learner, strict),
    );
    return { detected: true, fixed };
  });

  const falseRuns = runs.filter((r) => !used.has(r.first)).map((r) => r.first);
  const credit =
    results.reduce((sum, r) => sum + (r.detected ? 0.4 : 0) + (r.fixed ? 0.6 : 0), 0) /
    errors.length;
  return {
    score: Math.min(1, Math.max(0, credit - 0.1 * falseRuns.length)),
    correct: results.every((r) => r.fixed) && falseRuns.length === 0,
    detail: { kind: "find-fix", errors: results, falseRuns },
  };
}

/** The passage with every planted error replaced by its first accepted fix. */
export function correctedPassage(item: FindFixExercise): string {
  let out = "";
  let cursor = 0;
  for (const e of item.errors) {
    out += item.passage.slice(cursor, e.start) + (e.right[0] ?? "");
    cursor = e.end;
  }
  return (out + item.passage.slice(cursor))
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/ {2,}/g, " ");
}

// ─── Display + scoring helpers ───────────────────────────────────────────────

/** Short text identifying an exercise in review lists. */
export function exercisePrompt(item: LearnExercise): string {
  switch (item.type) {
    case "choice":
      return item.question;
    case "fill-blank":
      return item.sentence;
    case "reorder":
      return item.context || item.tokens.join(" / ");
    case "error-correction":
    case "proofread":
      return item.passage;
    case "rewrite":
      return item.source || item.instruction;
    case "compose":
      return item.instruction;
  }
}

/** The model solution as one readable string. */
export function exerciseSolution(item: LearnExercise): string {
  switch (item.type) {
    case "choice":
      return item.answer;
    case "fill-blank":
      return splitAtBlanks(item.sentence)
        .map((p, i) => p + (i < item.answers.length ? item.answers[i][0] : ""))
        .join("");
    case "reorder":
      return item.answer;
    case "error-correction":
    case "proofread":
      return correctedPassage(item);
    case "rewrite":
      return item.answers[0];
    case "compose":
      return item.modelAnswer;
  }
}

/** Percentage 0–100 (rounded) of `scores` out of `count` items. */
export function percentScore(scores: readonly number[], count: number): number {
  if (count <= 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / count) * 100);
}

export type Mastery = "secure" | "developing" | "review";

export function masteryFor(percent: number): Mastery {
  if (percent >= LANGUAGE_CHECK_LEARN_MASTERY_SECURE) return "secure";
  if (percent >= LANGUAGE_CHECK_LEARN_MASTERY_DEVELOPING) return "developing";
  return "review";
}

// ─── Learner answers (shared by the exercise UI and the tests) ───────────────

export interface FindFixAnswer {
  /** Tapped token indexes. */
  marked: number[];
  /** Replacement text typed for the run that starts at a token index. */
  fixes: Record<number, string>;
}

/** choice → picked option; fill-blank → one value per gap; reorder → tokens in
 *  the order placed; error-correction/proofread → marks + fixes; rewrite/compose → text. */
export type LearnAnswer = string | string[] | FindFixAnswer;

export function emptyAnswer(item: LearnExercise): LearnAnswer {
  switch (item.type) {
    case "choice":
    case "rewrite":
    case "compose":
      return "";
    case "fill-blank":
      return item.answers.map(() => "");
    case "reorder":
      return [];
    case "error-correction":
    case "proofread":
      return { marked: [], fixes: {} };
  }
}

/** Whether the learner has done enough to press "Check". */
export function answerReady(item: LearnExercise, answer: LearnAnswer): boolean {
  switch (item.type) {
    case "choice":
      return typeof answer === "string" && answer !== "";
    case "rewrite":
    case "compose":
      return typeof answer === "string" && answer.trim().length > 0;
    case "fill-blank":
      return Array.isArray(answer) && answer.length > 0 && answer.every((v) => v.trim() !== "");
    case "reorder":
      return Array.isArray(answer) && answer.length === item.tokens.length;
    case "error-correction":
    case "proofread":
      return typeof answer === "object" && !Array.isArray(answer) && answer.marked.length > 0;
  }
}

/**
 * Grades an answer locally. Returns null for open answers (rewrite that does
 * not match a known rewrite, and compose) — those need the AI to judge.
 */
export function gradeAnswer(
  item: LearnExercise,
  answer: LearnAnswer,
  strict = false,
): Grade | null {
  switch (item.type) {
    case "choice":
      return gradeChoice(item, answer as string);
    case "fill-blank":
      return gradeFillBlank(item, answer as string[], strict);
    case "reorder":
      return gradeReorder(item, answer as string[], strict);
    case "error-correction":
    case "proofread": {
      const a = answer as FindFixAnswer;
      return gradeFindFix(item, a.marked, a.fixes, strict);
    }
    case "rewrite":
      return gradeRewriteLocally(item, answer as string, strict);
    case "compose":
      return null;
  }
}

/** The learner's answer as readable text (for the quiz review). */
export function answerText(item: LearnExercise, answer: LearnAnswer): string {
  switch (item.type) {
    case "choice":
    case "rewrite":
    case "compose":
      return typeof answer === "string" ? answer : "";
    case "fill-blank":
      return splitAtBlanks(item.sentence)
        .map((p, i) => p + (Array.isArray(answer) && i < answer.length ? answer[i] : ""))
        .join("");
    case "reorder":
      return Array.isArray(answer) ? answer.join(" ") : "";
    case "error-correction":
    case "proofread": {
      if (typeof answer !== "object" || Array.isArray(answer) || answer.marked.length === 0) {
        return "";
      }
      const tokens = tokenizePassage(item.passage);
      return runsFromMarks(item.passage, tokens, answer.marked)
        .map((r) => `${r.text} → ${answer.fixes[r.first]?.trim() || "?"}`)
        .join("; ");
    }
  }
}

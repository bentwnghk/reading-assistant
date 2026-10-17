import type {
  LearnUnitWire,
  PracticeResult,
  QuizResult,
} from "@/utils/languageCheckLearnWire";

/**
 * Merging of learning-unit state — the single rule set that makes the browser
 * and the server converge, whichever device saved last.
 *
 * `mergeUnit(authoritative, incoming)`:
 *  - the server calls it with the STORED unit as `authoritative` and the
 *    browser's patch as `incoming`;
 *  - a browser calls it with the SERVER's unit as `authoritative` and its own
 *    local unit as `incoming`.
 * So "authoritative wins on conflict, incoming fills what authoritative lacks"
 * holds on both sides. Content is never deleted and progress only moves
 * forward, with one exception: a higher quiz round (a retake) replaces the
 * earlier round's questions and answers (the finished round was archived).
 */

/** Everything a patch may carry for one unit; `null`/`undefined` = no change. */
export type UnitIncoming = Partial<
  Pick<
    LearnUnitWire,
    | "lesson"
    | "practice"
    | "quiz"
    | "lessonSeen"
    | "practiceResults"
    | "quizResults"
    | "previousQuizPrompts"
    | "quizRound"
  >
>;

const MAX_PREVIOUS_PROMPTS = 120;

function ids(items: readonly { id: string }[]): string[] {
  return items.map((i) => i.id);
}

/**
 * Practice grows by appending ("More exercises"): the longer list wins when the
 * shorter one is a prefix of it (by id); anything else keeps the authoritative list.
 */
function pickItems<T extends { id: string }>(
  authoritative: T[] | null,
  incoming: T[] | null | undefined,
): T[] | null {
  if (!authoritative) return incoming ?? null;
  if (!incoming || incoming.length <= authoritative.length) return authoritative;
  const a = ids(authoritative);
  const b = ids(incoming);
  return a.every((id, i) => id === b[i]) ? incoming : authoritative;
}

function mergePractice(
  a: PracticeResult | undefined,
  b: PracticeResult | undefined,
): PracticeResult | undefined {
  if (!a) return b;
  if (!b) return a;
  const revealed = !!a.revealed || !!b.revealed;
  return {
    // Only the FIRST attempt is scored, so the authoritative score stands.
    score: a.score,
    attempts: Math.max(a.attempts, b.attempts),
    completed: a.completed || b.completed,
    ...(revealed ? { revealed: true } : {}),
  };
}

export function mergePracticeResults(
  authoritative: Record<string, PracticeResult>,
  incoming: Record<string, PracticeResult> | undefined,
): Record<string, PracticeResult> {
  const out: Record<string, PracticeResult> = { ...authoritative };
  for (const [id, result] of Object.entries(incoming ?? {})) {
    const merged = mergePractice(authoritative[id], result);
    if (merged) out[id] = merged;
  }
  return out;
}

function unionPrompts(a: readonly string[], b: readonly string[] | undefined): string[] {
  const out = [...a];
  for (const p of b ?? []) if (!out.includes(p)) out.push(p);
  return out.slice(-MAX_PREVIOUS_PROMPTS);
}

export function mergeUnit(authoritative: LearnUnitWire, incoming: UnitIncoming): LearnUnitWire {
  const round = incoming.quizRound ?? authoritative.quizRound;

  let quiz = authoritative.quiz;
  let quizResults = authoritative.quizResults;
  let previousQuizPrompts = authoritative.previousQuizPrompts;
  let quizRound = authoritative.quizRound;

  if (round > authoritative.quizRound) {
    // A retake: the new round starts with its own questions (not generated yet
    // → null) and no answers.
    quiz = incoming.quiz ?? null;
    quizResults = incoming.quizResults ?? {};
    previousQuizPrompts = unionPrompts(authoritative.previousQuizPrompts, incoming.previousQuizPrompts);
    quizRound = round;
  } else if (round === authoritative.quizRound) {
    quiz = authoritative.quiz ?? incoming.quiz ?? null;
    // A quiz answer is final: the first one stored stays.
    quizResults = { ...(incoming.quizResults ?? {}), ...authoritative.quizResults } as Record<
      string,
      QuizResult
    >;
    previousQuizPrompts = unionPrompts(authoritative.previousQuizPrompts, incoming.previousQuizPrompts);
  }
  // round < authoritative.quizRound → a stale device: its quiz fields are ignored.

  return {
    ...authoritative,
    lesson: authoritative.lesson ?? incoming.lesson ?? null,
    practice: pickItems(authoritative.practice, incoming.practice),
    quiz,
    lessonSeen: authoritative.lessonSeen || !!incoming.lessonSeen,
    practiceResults: mergePracticeResults(authoritative.practiceResults, incoming.practiceResults),
    quizResults,
    previousQuizPrompts,
    quizRound,
  };
}

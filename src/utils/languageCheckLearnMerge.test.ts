import { describe, expect, it } from "vitest";
import { mergeUnit } from "./languageCheckLearnMerge";
import { practiceProgress, quizProgress, redactUnitForReview, rollupSession } from "./languageCheckLearnProgress";
import type { LearnUnitWire } from "./languageCheckLearnWire";

const item = (id: string) => ({
  id,
  type: "choice" as const,
  question: "q",
  options: ["a", "b"],
  answer: "a",
  hint: "",
  explanation: "",
  explanationZh: "",
});

const unit = (patch: Partial<LearnUnitWire> = {}): LearnUnitWire => ({
  category: "tense",
  mistakeCount: 2,
  samples: [],
  lesson: null,
  practice: null,
  quiz: null,
  lessonSeen: false,
  practiceResults: {},
  quizResults: {},
  previousQuizPrompts: [],
  quizRound: 1,
  ...patch,
});

describe("mergeUnit", () => {
  it("fills what the stored unit lacks and never removes content", () => {
    const stored = unit({ practice: [item("a"), item("b")] });
    const merged = mergeUnit(stored, { practice: null, lesson: null });
    expect(merged.practice).toHaveLength(2);
    const grown = mergeUnit(stored, { practice: [item("a"), item("b"), item("c")] });
    expect(grown.practice).toHaveLength(3);
    const shorter = mergeUnit(grown, { practice: [item("a")] });
    expect(shorter.practice).toHaveLength(3);
  });

  it("keeps the stored list when the incoming one is a different set", () => {
    const stored = unit({ practice: [item("a"), item("b")] });
    const merged = mergeUnit(stored, { practice: [item("x"), item("y"), item("z")] });
    expect(merged.practice?.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("practice: first-attempt score stands, attempts/completed only move forward", () => {
    const stored = unit({ practiceResults: { a: { score: 0, attempts: 1, completed: false } } });
    const merged = mergeUnit(stored, {
      practiceResults: {
        a: { score: 1, attempts: 3, completed: true, revealed: true },
        b: { score: 1, attempts: 1, completed: true },
      },
    });
    expect(merged.practiceResults.a).toEqual({ score: 0, attempts: 3, completed: true, revealed: true });
    expect(merged.practiceResults.b.completed).toBe(true);
    const back = mergeUnit(merged, { practiceResults: { a: { score: 0, attempts: 1, completed: false } } });
    expect(back.practiceResults.a.completed).toBe(true);
  });

  it("quiz answers are final within a round", () => {
    const stored = unit({
      quiz: [item("q1")],
      quizResults: { q1: { answer: "b", score: 0, correct: false } },
    });
    const merged = mergeUnit(stored, { quizResults: { q1: { answer: "a", score: 1, correct: true } } });
    expect(merged.quizResults.q1.correct).toBe(false);
  });

  it("a higher round replaces the quiz; a stale lower round is ignored", () => {
    const stored = unit({
      quiz: [item("q1")],
      quizResults: { q1: { answer: "a", score: 1, correct: true } },
      previousQuizPrompts: ["one"],
    });
    const retake = mergeUnit(stored, { quizRound: 2, quiz: [item("r1")], quizResults: {}, previousQuizPrompts: ["two"] });
    expect(retake.quizRound).toBe(2);
    expect(retake.quiz?.map((i) => i.id)).toEqual(["r1"]);
    expect(retake.quizResults).toEqual({});
    expect(retake.previousQuizPrompts).toEqual(["one", "two"]);

    const stale = mergeUnit(retake, { quizRound: 1, quiz: [item("q1")], quizResults: { q1: { answer: "a", score: 1, correct: true } } });
    expect(stale.quizRound).toBe(2);
    expect(stale.quiz?.map((i) => i.id)).toEqual(["r1"]);
    expect(stale.quizResults).toEqual({});
  });

  it("a retake that has no questions yet starts empty (not the old round's)", () => {
    const stored = unit({ quiz: [item("q1")], quizResults: { q1: { answer: "a", score: 1, correct: true } } });
    const retake = mergeUnit(stored, { quizRound: 2, quizResults: {} });
    expect(retake.quiz).toBeNull();
  });

  it("is idempotent", () => {
    const stored = unit({ lessonSeen: true, practice: [item("a")], practiceResults: { a: { score: 1, attempts: 1, completed: true } } });
    const once = mergeUnit(stored, stored);
    expect(mergeUnit(once, stored)).toEqual(once);
  });
});

describe("progress maths", () => {
  it("percent is null until every item is done, then the mean of the scores", () => {
    const items = [item("a"), item("b")];
    expect(quizProgress(items, { a: { score: 1, correct: true } }).percent).toBeNull();
    const done = quizProgress(items, { a: { score: 1, correct: true }, b: { score: 0.5, correct: false } });
    expect(done).toMatchObject({ percent: 75, correct: 1, mastery: "developing" });
    expect(practiceProgress(items, { a: { score: 1, completed: true }, b: { score: 0, completed: true } }).percent).toBe(50);
    expect(quizProgress(null, {}).total).toBe(0);
  });

  it("rolls a session up: secure/developing/review counts and the average", () => {
    const secure = unit({ category: "tense", quiz: [item("a")], quizResults: { a: { answer: "a", score: 1, correct: true } } });
    const review = unit({ category: "article", quiz: [item("b")], quizResults: { b: { answer: "b", score: 0, correct: false } } });
    const open = unit({ category: "spelling" });
    const r = rollupSession([secure, review, open]);
    expect(r).toMatchObject({ unitCount: 3, unitsCompleted: 2, avgQuizPercent: 50, allDone: false });
    expect(r.masteryCounts).toEqual({ secure: 1, developing: 0, review: 1 });
    expect(rollupSession([secure, review]).allDone).toBe(true);
    expect(rollupSession([]).allDone).toBe(false);
  });
});

describe("practice progress shown mid-way", () => {
  it("percentSoFar is the score over answered items; percent stays null until all are done", () => {
    const items = [item("a"), item("b"), item("c")];
    const p = practiceProgress(items, {
      a: { score: 0, completed: true },
      b: { score: 1, completed: true },
    });
    expect(p).toMatchObject({ completed: 2, total: 3, percent: null, percentSoFar: 50 });
    expect(practiceProgress(items, {}).percentSoFar).toBeNull();
  });

  it("wrong first, then right on retry: completes, with the first-attempt score kept", () => {
    const items = [item("a"), item("b")];
    const p = practiceProgress(items, {
      a: { score: 0, completed: true },
      b: { score: 1, completed: true },
    });
    expect(p).toMatchObject({ completed: 2, total: 2, percent: 50 });
  });
});

describe("redactUnitForReview", () => {
  const answered = (id: string, correct = true) => ({ answer: "a", score: correct ? 1 : 0, correct });
  const full = (patch: Partial<LearnUnitWire> = {}) =>
    unit({
      lesson: { title: "T" } as never,
      practice: [item("p1"), item("p2")],
      quiz: [item("q1"), item("q2")],
      previousQuizPrompts: ["an old question"],
      ...patch,
    });

  it("withholds unfinished practice AND quiz, keeps the lesson and says how far the learner got", () => {
    const u = full({
      practiceResults: { p1: { score: 1, attempts: 1, completed: true } },
      quizResults: { q1: answered("q1") },
    });
    const r = redactUnitForReview(u);
    expect(r.practice).toBeNull();
    expect(r.quiz).toBeNull();
    expect(r.practiceResults).toEqual({});
    expect(r.quizResults).toEqual({});
    expect(r.previousQuizPrompts).toEqual([]);
    expect(r.lesson).toBe(u.lesson);
    expect(r.hidden).toEqual({ practice: { completed: 1, total: 2 }, quiz: { answered: 1, total: 2 } });
    // nothing of the questions survives serialisation
    expect(JSON.stringify(r)).not.toContain("She ___");
    expect(JSON.stringify(r)).not.toContain("an old question");
  });

  it("a finished stage is shown, an unfinished one is not (independently)", () => {
    const practiceDone = full({
      practiceResults: { p1: { score: 1, attempts: 1, completed: true }, p2: { score: 0, attempts: 2, completed: true } },
    });
    const r = redactUnitForReview(practiceDone);
    expect(r.practice).toHaveLength(2);
    expect(r.quiz).toBeNull();
    expect(r.hidden).toEqual({ quiz: { answered: 0, total: 2 } });

    const quizDone = full({ quizResults: { q1: answered("q1"), q2: answered("q2", false) } });
    const r2 = redactUnitForReview(quizDone);
    expect(r2.quiz).toHaveLength(2);
    expect(r2.practice).toBeNull();
  });

  it("returns the same object when there is nothing to hide, and ignores stages that were never generated", () => {
    const done = full({
      practiceResults: { p1: { score: 1, attempts: 1, completed: true }, p2: { score: 1, attempts: 1, completed: true } },
      quizResults: { q1: answered("q1"), q2: answered("q2") },
    });
    expect(redactUnitForReview(done)).toBe(done);
    const none = unit();
    expect(redactUnitForReview(none)).toBe(none);
  });
});

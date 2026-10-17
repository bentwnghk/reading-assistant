import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getPool: () => ({}), getClient: async () => ({}) }));
vi.mock("@/lib/users", () => ({ getSchoolForUser: async () => null }));

import { deriveEvents } from "./language-check-learn";
import type { LearnUnitWire } from "@/utils/languageCheckLearnWire";

const item = (id: string) => ({
  id, type: "choice" as const, question: "q", options: ["a", "b"], answer: "a", hint: "", explanation: "", explanationZh: "",
});
const base = (): LearnUnitWire => ({
  category: "tense", mistakeCount: 1, samples: [], lesson: null, practice: null, quiz: null, lessonSeen: false,
  practiceResults: {}, quizResults: {}, previousQuizPrompts: [], quizRound: 1,
});
const types = (before: LearnUnitWire, after: LearnUnitWire) =>
  deriveEvents("s1", [before], [after]).map((e) => e.type);

describe("deriveEvents", () => {
  it("logs nothing when nothing changed (a replayed save is silent)", () => {
    const u = { ...base(), lessonSeen: true, practice: [item("a")], practiceResults: { a: { score: 1, attempts: 1, completed: true } } };
    expect(types(u, u)).toEqual([]);
  });

  it("logs each new fact once, with deterministic keys", () => {
    const after: LearnUnitWire = {
      ...base(),
      lessonSeen: true,
      practice: [item("a"), item("b")],
      practiceResults: {
        a: { score: 1, attempts: 1, completed: true },
        b: { score: 0, attempts: 2, completed: true, revealed: true },
      },
    };
    const events = deriveEvents("s1", [base()], [after]);
    expect(events.map((e) => e.type).sort()).toEqual(
      ["lesson_viewed", "practice_answered", "practice_answered", "practice_completed", "practice_generated", "practice_revealed"].sort(),
    );
    const again = deriveEvents("s1", [base()], [after]);
    expect(again.map((e) => e.key)).toEqual(events.map((e) => e.key));
    expect(new Set(events.map((e) => e.key)).size).toBe(events.length);
  });

  it("quiz completion carries the percentage; a retake logs the new round", () => {
    const answered: LearnUnitWire = {
      ...base(),
      quiz: [item("q1"), item("q2")],
      quizResults: { q1: { answer: "a", score: 1, correct: true }, q2: { answer: "b", score: 0, correct: false } },
    };
    const done = deriveEvents("s1", [{ ...answered, quizResults: { q1: answered.quizResults.q1 } }], [answered]);
    const completed = done.find((e) => e.type === "quiz_completed");
    expect(completed?.details).toMatchObject({ percent: 50, correct: 1, total: 2, mastery: "developing", round: 1 });
    expect(done.filter((e) => e.type === "quiz_answered")).toHaveLength(1);

    const retake: LearnUnitWire = { ...base(), quizRound: 2, quiz: [item("r1")], quizResults: {} };
    expect(types(answered, retake)).toEqual(["quiz_retaken", "quiz_generated"]);
  });

  it("appending practice after completion logs the extra set, then its completion", () => {
    const finished: LearnUnitWire = { ...base(), practice: [item("a")], practiceResults: { a: { score: 1, attempts: 1, completed: true } } };
    const more: LearnUnitWire = { ...finished, practice: [item("a"), item("b")] };
    expect(types(finished, more)).toEqual(["practice_generated"]);
    const moreDone: LearnUnitWire = { ...more, practiceResults: { ...more.practiceResults, b: { score: 1, attempts: 1, completed: true } } };
    expect(types(more, moreDone)).toEqual(["practice_answered", "practice_completed"]);
  });
});

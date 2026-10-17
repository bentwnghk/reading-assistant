import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LearnPath from "./LearnPath";
import LearnSummary from "./LearnSummary";
import LessonView from "./LessonView";
import QuizPlayer from "./QuizPlayer";
import { createUnit, type LearnSession } from "@/store/languageCheckLearn";
import { parseExercises, parseLesson } from "@/utils/languageCheckLearn";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}${JSON.stringify(opts)}` : key,
  }),
}));

vi.mock("@/hooks/useLanguageCheckLearn", () => ({
  default: () => ({
    ensureQuiz: vi.fn(),
    ensurePractice: vi.fn(),
    ensureLesson: vi.fn(),
    evaluateOpen: vi.fn(),
  }),
}));

afterEach(cleanup);

const lesson = parseLesson({
  title: "Agreement",
  summary: "Add -s for he/she/it.",
  rules: [{ heading: "Rule", explanation: "Because.", pattern: "he + verb-s", examples: ["She runs."] }],
  contrasts: [{ wrong: "She run.", right: "She runs.", why: "Needs -s." }],
  chineseTransfer: { explanation: "Chinese verbs never change." },
  tips: [{ tip: "Circle the verb." }],
});

const quiz = parseExercises(
  [
    { type: "choice", question: "She ___ home.", options: ["go", "goes"], answer: "goes", explanation: "Add -s." },
    { type: "fill-blank", sentence: "He ___ fast.", answers: [["runs"]] },
  ],
  { idPrefix: "q1", allowed: ["choice", "fill-blank"], max: 5 },
).items;

function unit() {
  const u = createUnit("subject-verb-agreement", 3, [
    { original: "go", correction: "goes", explanation: "Add -s.", sentence: "She go home." },
  ]);
  u.lesson = { status: "ready", data: lesson, error: null };
  return u;
}

function session(u = unit()): LearnSession {
  return {
    key: "k",
    essayId: "e",
    essayTitle: "My essay",
    age: 15,
    status: "in_progress",
    units: [u],
    current: { unit: 0, stage: "lesson" },
  };
}

describe("learn screens render", () => {
  it("lesson shows the learner's mistake, rule, contrast, transfer and tips", () => {
    const onContinue = vi.fn();
    render(
      <LessonView unit={unit()} lesson={lesson} language="en" categoryLabel="SVA" onContinue={onContinue} />,
    );
    expect(screen.getByText("Add -s for he/she/it.")).toBeTruthy();
    expect(screen.getAllByText("She runs.").length).toBe(2);
    expect(screen.getByText("Chinese verbs never change.")).toBeTruthy();
    expect(screen.getByText("Circle the verb.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /startPractice/ }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("path locks practice until the lesson has been seen", () => {
    const onGo = vi.fn();
    render(<LearnPath session={session()} onGo={onGo} />);
    const practice = screen.getByRole("button", { name: /path.practice/ }) as HTMLButtonElement;
    expect(practice.disabled).toBe(true);
    const summary = screen.getByRole("button", { name: /path.summary/ }) as HTMLButtonElement;
    expect(summary.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /path.lesson/ }));
    expect(onGo).toHaveBeenCalledWith({ unit: 0, stage: "lesson" });
  });

  it("quiz: intro → answer every question → review with model answers", () => {
    const u = unit();
    u.quiz = { status: "ready", data: quiz, error: null };
    const { rerender } = render(
      <QuizPlayer sessionKey="k" unit={u} language="en" nextLabel="Next" onNext={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /quiz.begin/ }));
    expect(screen.getByText(/exercise.counter\{"current":1,"total":2\}/)).toBeTruthy();

    // Finished quiz renders the review.
    const done = unit();
    done.quiz = { status: "ready", data: quiz, error: null };
    done.quizResults = {
      "q1-1": { answer: "go", score: 0, correct: false },
      "q1-2": { answer: ["runs"], score: 1, correct: true },
    };
    rerender(<QuizPlayer sessionKey="k" unit={done} language="en" nextLabel="Next" onNext={vi.fn()} />);
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getAllByText("goes").length).toBeGreaterThan(0);
    expect(screen.getByText("Add -s.")).toBeTruthy();
  });

  it("summary lists each topic with its mastery", () => {
    const u = unit();
    u.quiz = { status: "ready", data: quiz, error: null };
    u.quizResults = {
      "q1-1": { answer: "goes", score: 1, correct: true },
      "q1-2": { answer: ["runs"], score: 1, correct: true },
    };
    render(<LearnSummary session={session(u)} onReview={vi.fn()} onBackToEssay={vi.fn()} />);
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("languageCheck.learn.summary.levels.secure")).toBeTruthy();
    expect(screen.getByText("languageCheck.learn.summary.allSecure")).toBeTruthy();
  });
});

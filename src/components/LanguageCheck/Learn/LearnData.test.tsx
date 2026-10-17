import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LearnDashboardView from "./LearnDashboardView";
import LearnSessionDetail from "./LearnSessionDetail";
import type {
  LearnDashboardData,
  LearnRoundWire,
  LearnSessionWire,
} from "@/utils/languageCheckLearnWire";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}${JSON.stringify(opts)}` : key,
    i18n: { language: "en-US" },
  }),
}));

// recharts needs real layout; the numbers are what matter here.
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub, ComposedChart: Stub, LineChart: Stub, Bar: Stub, Line: Stub,
    XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub, Legend: Stub,
  };
});

afterEach(cleanup);

const totals = {
  learners: 1, sessionsStarted: 3, sessionsCompleted: 2, lessonsViewed: 4, practiceAnswered: 20,
  practiceAccuracy: 65, quizzesCompleted: 5, avgQuizPercent: 72, improvement: 18,
  topicsSecure: 2, topicsDeveloping: 1, topicsReview: 1, activeDays: 6, activeMinutes: 95,
  lastActiveAt: 1,
};
const data = (over: Partial<LearnDashboardData> = {}): LearnDashboardData => ({
  range: 30, timeZone: "UTC", bucketUnit: "day", totals,
  series: [{ bucket: "2026-10-01", events: 3, practiceAnswered: 2, quizzesCompleted: 1, avgQuizPercent: 60 }],
  categories: [{ category: "tense", learners: 4, quizzes: 3, avgLatest: 85, improvement: 20, secure: 3, developing: 1, review: 0, practiceAccuracy: 70 }],
  quizHistory: [],
  ...over,
});

describe("LearnDashboardView", () => {
  it("shows the headline numbers, formatted time and the per-topic table", () => {
    render(<LearnDashboardView data={data()} />);
    expect(screen.getByText("20")).toBeTruthy(); // practice answers
    expect(screen.getByText("+18")).toBeTruthy(); // improvement, signed
    expect(screen.getByText(/hoursMinutes\{"hours":1,"minutes":35\}/)).toBeTruthy();
    expect(screen.getByText("85%")).toBeTruthy();
    expect(screen.getByText("+20")).toBeTruthy();
    expect(screen.queryByText("languageCheck.learnData.colLearners")).toBeNull();
  });

  it("staff view adds the learners column", () => {
    render(<LearnDashboardView data={data()} showLearners />);
    expect(screen.getByText("languageCheck.learnData.colLearners")).toBeTruthy();
  });

  it("shows the empty state instead of zeros when there is no activity", () => {
    render(
      <LearnDashboardView
        data={data({ totals: { ...totals, sessionsStarted: 0, lessonsViewed: 0, quizzesCompleted: 0 }, series: [], categories: [] })}
      />,
    );
    expect(screen.getByText("languageCheck.learnData.noData")).toBeTruthy();
  });
});

const exercise = {
  id: "q1", type: "choice" as const, question: "She ___ home.", options: ["go", "goes"], answer: "goes",
  hint: "", explanation: "Add -s.", explanationZh: "",
};
const session: LearnSessionWire = {
  id: "s", essayId: null, essayTitle: "My essay", age: 15, status: "completed",
  current: "summary", createdAt: 1, updatedAt: 2,
  units: [{
    category: "subject-verb-agreement", mistakeCount: 2, samples: [], lesson: null,
    practice: [exercise], quiz: [{ ...exercise, id: "q2" }], lessonSeen: true,
    practiceResults: { q1: { score: 0, attempts: 2, completed: true, revealed: true } },
    quizResults: { q2: { answer: "go", score: 0, correct: false } },
    previousQuizPrompts: [], quizRound: 2,
  }],
};
const rounds: LearnRoundWire[] = [{
  category: "subject-verb-agreement", round: 1, percent: 100, correct: 1, total: 1, mastery: "secure",
  items: [{ ...exercise, id: "old" }], results: { old: { answer: "goes", score: 1, correct: true } }, completedAt: 5,
}];

describe("LearnSessionDetail (read-only)", () => {
  it("shows the saved quiz round, learner's wrong answer and the model answer; earlier rounds are selectable", () => {
    render(<LearnSessionDetail session={session} rounds={rounds} />);
    // default = latest round (2, in progress → finished answers shown)
    expect(screen.getByText("go")).toBeTruthy();
    expect(screen.getAllByText("goes").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /round\{"round":1\}/ }));
    expect(screen.getByText("Add -s.")).toBeTruthy();
    expect(screen.queryByText("go")).toBeNull();
  });

  it("practice tab flags revealed answers; lesson tab explains a missing lesson without a Start button", () => {
    render(<LearnSessionDetail session={session} rounds={rounds} />);
    fireEvent.click(screen.getByRole("tab", { name: "languageCheck.learn.path.practice" }));
    expect(screen.getByText(/detail.revealed/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "languageCheck.learn.path.lesson" }));
    expect(screen.getByText("languageCheck.learnData.detail.noLesson")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /startPractice/ })).toBeNull();
  });
});

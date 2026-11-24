import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AssignmentStats } from "./AssignmentStats";

// Regression test for the chart-order bug behind the card subtitle
// "Mean score (0–100), hardest at the top": recharts vertical bar charts
// render the FIRST array item at the TOP, so the chart data must be sorted
// ASCENDING by mean (lowest first). The sort was descending, which put the
// easiest activity at the top — the opposite of the subtitle (and of the
// landing-page mockup, whose static bars are hardest-first).

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "assignments.teacherView.testScoreCol": "TEST",
        "assignments.teacherView.vocabCol": "VOCAB",
        "assignments.teacherView.spellingCol": "SPELL",
        "assignments.teacherView.grammarQuizCol": "GQUIZ",
        "assignments.teacherView.grammarGameCol": "GGAME",
      };
      if (labels[key]) return labels[key];
      if (opts && "threshold" in opts) return `${key}:${String(opts.threshold)}`;
      return key;
    },
  }),
}));

// jsdom has no layout, so ResponsiveContainer would measure 0×0 and render
// nothing. Swap it for a fixed-size passthrough that injects width/height
// into the BarChart exactly like the real one does. Everything else in
// recharts stays REAL, so the YAxis band scale — which determines the
// vertical order — runs the genuine production code path.
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactElement<{ width?: number; height?: number }>;
  }) => React.cloneElement(children, { width: 600, height: 260 }),
}));

function submission(id: string, scores: Partial<AssignmentSubmission>): AssignmentSubmission {
  return {
    id,
    assignmentId: "a1",
    studentId: id,
    studentName: null,
    studentEmail: null,
    studentSessionId: null,
    progress: 100,
    testCompleted: true,
    createdAt: "2026-01-01",
    ...scores,
  };
}

describe("AssignmentStats performance-by-activity chart", () => {
  it("renders the hardest (lowest-mean) activity at the top and excludes unattempted activities", async () => {
    // Means: TEST 90, GGAME 70, VOCAB 50, GQUIZ 20 — SPELL is never attempted
    // (no spellingGameAccuracy anywhere) and must not appear in the chart.
    const roster: AssignmentSubmission[] = [
      submission("s1", {
        testScore: 90,
        vocabularyQuizScore: 60,
        grammarQuizScore: 20,
        grammarGameAccuracy: 70,
      }),
      submission("s2", {
        testScore: 80,
        vocabularyQuizScore: 40,
        grammarQuizScore: 30,
        grammarGameAccuracy: 70,
      }),
      submission("s3", { testScore: 100, grammarQuizScore: 10 }),
    ];

    const { container } = render(<AssignmentStats roster={roster} />);

    // Y-axis category labels appear once the chart's internal store settles.
    await waitFor(() => {
      expect(container.querySelectorAll(".recharts-surface text")).not.toHaveLength(0);
    });

    // Category labels are <text x=… y=…>; SVG y grows DOWNWARD, so sorting by
    // y yields the visual top-to-bottom order. X-axis ticks and the mean value
    // labels are pure numbers and are filtered out.
    const labels = Array.from(container.querySelectorAll(".recharts-surface text"))
      .map((t) => ({ text: t.textContent ?? "", y: Number(t.getAttribute("y")) }))
      .filter((l) => l.text !== "" && !/^\d+$/.test(l.text) && !Number.isNaN(l.y))
      .sort((a, b) => a.y - b.y)
      .map((l) => l.text);

    expect(labels).toEqual(["GQUIZ", "VOCAB", "GGAME", "TEST"]);
  });
});

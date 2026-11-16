import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TopicAiReport from "./TopicAiReport";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { parseExercises } from "@/utils/languageCheckLearn";

// Reproduction of the reported regression: after the saved report's GET
// returns a persisted worksheet, the page must show the dropdown button
// (download again / regenerate), not the plain "Generate follow-up exercise"
// button — i.e. hydration into the store cache works and the snapshot check
// matches. Also pins the negative: no stored worksheet → plain button.

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: "teacher" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => {
    if (opts && "count" in opts) return `${key}:${opts.count}`;
    return key;
  } }),
}));

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams("topic=t1"),
}));

const generateFollowUpExercises = vi.fn();
const persistFollowUpWorksheet = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/useLanguageCheck", () => ({
  default: () => ({
    generateTopicAiReport: vi.fn(),
    generateFollowUpExercises,
    persistFollowUpWorksheet,
    transcribe: vi.fn(),
    runCheck: vi.fn(),
    runStaffCheck: vi.fn(),
    assessLanguage: vi.fn(),
    enhanceEssay: vi.fn(),
    generate: vi.fn(),
  }),
}));

const GENERATED_AT = 1731700000000;

function reportFixture(): LanguageCheckAiReport {
  return {
    version: 1,
    generatedAt: GENERATED_AT,
    model: "test-model",
    essayCount: 4,
    base: {
      topic: {
        id: "t1",
        title: "A letter to the editor",
        topic: "",
        essayType: "dse-part-b",
        hasQuestionImage: false,
        classId: null,
        className: "4A",
        creatorName: null,
        createdAt: 0,
      },
      studentCount: 4,
      checkedCount: 4,
      highest: 7,
      lowest: 2,
      avgWords: 220,
      avgErrors: 9,
      distribution: [0, 1, 2, 1, 0],
      doneStudents: 4,
      assessedCount: 4,
      commonErrors: [],
      pending: [],
      max: { overall: 7, content: 0, language: 0, organization: 0, features: 0 },
      averages: { overall: 4, content: null, language: null, organization: null, features: null },
      students: [],
    },
    categories: [],
    insights: {
      headline: "h",
      summary: "s",
      criteria: [],
      strengths: [],
      mistakes: [{ category: "subject-verb-agreement", title: "Missing -s", rule: "he/she/it + verb-s", tip: "Circle every verb." }],
      priorities: [],
      quickTips: [],
    },
  };
}

function worksheetItems() {
  const { items } = parseExercises(
    [
      {
        type: "fill-blank",
        sentence: "She ___ to school every day.",
        answers: [["goes"]],
        hint: "he/she/it + ?",
        explanation: "Add -s.",
        explanationZh: "加 -s。",
      },
    ],
    { idPrefix: "fu", allowed: ["error-correction", "fill-blank"], max: 5 },
  );
  return items.map((exercise) => ({ exercise, category: "subject-verb-agreement" }));
}

function mockFetch(followUp: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ saved: reportFixture(), currentCount: 4, followUp }),
  });
}

beforeEach(() => {
  cleanup();
  push.mockClear();
  replace.mockClear();
  generateFollowUpExercises.mockClear();
  persistFollowUpWorksheet.mockClear();
  useLanguageCheckStore.getState().reset();
  useLanguageCheckStore.setState({ followUpWorksheets: {} });
});

describe("TopicAiReport follow-up button persistence", () => {
  it("shows the dropdown when the server returns a stored worksheet for this snapshot", async () => {
    vi.stubGlobal("fetch", mockFetch({ generatedAt: GENERATED_AT, items: worksheetItems() }));
    const { container } = render(<TopicAiReport />);

    // Report + button render, and the trigger carries the dropdown chevron.
    await screen.findByText("languageCheck.followUp.button");
    expect(container.querySelector(".lucide-chevron-down")).not.toBeNull();
    // Hydrated into the store cache, keyed by topic.
    expect(useLanguageCheckStore.getState().followUpWorksheets["t1"]).toMatchObject({
      generatedAt: GENERATED_AT,
    });
    // No generation / write-back happens on a plain load.
    expect(generateFollowUpExercises).not.toHaveBeenCalled();
    expect(persistFollowUpWorksheet).not.toHaveBeenCalled();
  });

  it("shows the plain generate button when no worksheet is stored", async () => {
    vi.stubGlobal("fetch", mockFetch(null));
    const { container } = render(<TopicAiReport />);

    await screen.findByText("languageCheck.followUp.button");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();
    expect(useLanguageCheckStore.getState().followUpWorksheets["t1"]).toBeUndefined();
  });

  it("ignores a stored worksheet from a different report snapshot", async () => {
    vi.stubGlobal("fetch", mockFetch({ generatedAt: GENERATED_AT - 1, items: worksheetItems() }));
    const { container } = render(<TopicAiReport />);

    await screen.findByText("languageCheck.followUp.button");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();
    expect(useLanguageCheckStore.getState().followUpWorksheets["t1"]).toBeUndefined();
  });
});

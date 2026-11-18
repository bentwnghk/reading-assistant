import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TopicAiReport from "./TopicAiReport";
import { useLanguageCheckStore } from "@/store/languageCheck";

// Mirror of TopicAiReport.followup.test.tsx for the per-card student handouts:
// after the saved report's GET returns stored priority handouts, each card
// must show the dropdown (download again / regenerate), not the plain
// "Student handout" button — i.e. hydration into the store cache works and
// the snapshot check matches. Also pins the negatives (nothing stored → plain
// button; stale snapshot ignored) and the per-index self-heal write-back
// (a local handout the server lacks is re-pushed on load).

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

const persistPriorityHandout = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/useLanguageCheck", () => ({
  default: () => ({
    generateTopicAiReport: vi.fn(),
    generateFollowUpExercises: vi.fn(),
    persistFollowUpWorksheet: vi.fn().mockResolvedValue(undefined),
    generatePriorityHandout: vi.fn(),
    persistPriorityHandout,
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
      mistakes: [],
      priorities: [{ title: "Tense consistency", why: "w", activity: "a", minutes: 15 }],
      quickTips: [],
    },
  };
}

function handoutFixture() {
  return {
    lesson: {
      title: "Tense consistency",
      titleZh: "",
      summary: "Keep one tense.",
      summaryZh: "",
      goal: "I can keep one tense.",
      goalZh: "",
      whyItMatters: "",
      whyItMattersZh: "",
      rules: [],
      contrasts: [],
      chineseTransfer: null,
      tips: [],
      tryIt: null,
    },
    exercises: [],
  };
}

function mockFetch(priorityHandouts: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ saved: reportFixture(), currentCount: 4, followUp: null, priorityHandouts }),
  });
}

beforeEach(() => {
  cleanup();
  push.mockClear();
  replace.mockClear();
  persistPriorityHandout.mockClear();
  useLanguageCheckStore.getState().reset();
  useLanguageCheckStore.setState({ followUpWorksheets: {}, priorityHandouts: {} });
});

describe("TopicAiReport priority handout button persistence", () => {
  it("shows the dropdown when the server returns a stored handout for this snapshot", async () => {
    vi.stubGlobal("fetch", mockFetch({ generatedAt: GENERATED_AT, handouts: { 0: handoutFixture() } }));
    const { container } = render(<TopicAiReport />);

    // Report + card render, and the trigger carries the dropdown chevron.
    await screen.findByText("languageCheck.priorityHandout.button");
    expect(container.querySelector(".lucide-chevron-down")).not.toBeNull();
    // Hydrated into the store cache, keyed by topic and priority index.
    expect(useLanguageCheckStore.getState().priorityHandouts["t1"]).toMatchObject({
      generatedAt: GENERATED_AT,
      handouts: { 0: handoutFixture() },
    });
    // No write-back happens on a plain load.
    expect(persistPriorityHandout).not.toHaveBeenCalled();
  });

  it("shows the plain generate button when no handout is stored", async () => {
    vi.stubGlobal("fetch", mockFetch(null));
    const { container } = render(<TopicAiReport />);

    await screen.findByText("languageCheck.priorityHandout.button");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();
    expect(useLanguageCheckStore.getState().priorityHandouts["t1"]).toBeUndefined();
    expect(persistPriorityHandout).not.toHaveBeenCalled();
  });

  it("ignores a stored handout from a different report snapshot", async () => {
    vi.stubGlobal("fetch", mockFetch({ generatedAt: GENERATED_AT - 1, handouts: { 0: handoutFixture() } }));
    const { container } = render(<TopicAiReport />);

    await screen.findByText("languageCheck.priorityHandout.button");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();
    expect(useLanguageCheckStore.getState().priorityHandouts["t1"]).toBeUndefined();
  });

  it("self-heals: re-pushes a local handout the server lacks", async () => {
    useLanguageCheckStore.setState({
      priorityHandouts: { t1: { generatedAt: GENERATED_AT, handouts: { 0: handoutFixture() } } },
    });
    vi.stubGlobal("fetch", mockFetch(null));
    const { container } = render(<TopicAiReport />);

    await screen.findByText("languageCheck.priorityHandout.button");
    // The in-memory cache keeps the dropdown alive…
    expect(container.querySelector(".lucide-chevron-down")).not.toBeNull();
    // …and the missing server entry is pushed back silently.
    expect(persistPriorityHandout).toHaveBeenCalledWith("t1", GENERATED_AT, 0, handoutFixture());
  });
});

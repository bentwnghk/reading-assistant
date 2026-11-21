import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import TopicLibrary from "./TopicLibrary";
import { useLanguageCheckStore } from "@/store/languageCheck";

// Regression tests for the Topic Library filter: a class pick and a word
// search (title, topic text or class name) narrow the list client-side,
// with a distinct "no match" empty state.

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "u1", role: "teacher" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const CLASSES: ClassInfo[] = [
  { id: "c1", name: "Gp1", subjectName: "English", gradeName: "S5", createdAt: 0 },
  { id: "c2", name: "Gp2", subjectName: "English", gradeName: "S6", createdAt: 0 },
];

const TOPICS: LanguageCheckTopicSummary[] = [
  {
    id: "a",
    title: "Climate essay",
    topic: "Write about climate change",
    essayType: "dse-part-a",
    hasQuestionImage: false,
    userId: "u1",
    classId: "c1",
    className: "S5 · English · Gp1",
    creatorName: null,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "b",
    title: "Speech task",
    topic: "Write a speech",
    essayType: "dse-part-b",
    hasQuestionImage: false,
    userId: "u2",
    classId: "c1",
    className: "S5 · English · Gp1",
    creatorName: "Ms Chan",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "c",
    title: "Personal task",
    topic: "Free writing",
    essayType: "js-writing",
    hasQuestionImage: false,
    userId: "u1",
    classId: null,
    className: null,
    creatorName: null,
    createdAt: 0,
    updatedAt: 0,
  },
];

beforeEach(() => {
  useLanguageCheckStore.setState({
    topics: TOPICS,
    topicsLoaded: true,
    topicsLoading: false,
  });
  // cmdk needs ResizeObserver, absent in jsdom
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // Radix Popover jsdom shims
  if (!("hasPointerCapture" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => {},
    });
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => {},
    });
  }
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/classes") {
      return { ok: true, json: async () => CLASSES } as Response;
    }
    if (url.pathname === "/api/writing-assessment/topics") {
      return { ok: true, json: async () => TOPICS } as Response;
    }
    throw new Error(`unexpected fetch: ${url.pathname}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Opens the class filter popover (the library's only combobox). */
async function openClassFilter() {
  fireEvent.click(screen.getByRole("combobox"));
  await waitFor(() => {
    expect(
      screen.getAllByText("languageCheck.topics.allClasses").length,
    ).toBeGreaterThan(0);
  });
}

/** Clicks a plain command item ("All classes" / "No class (personal)"). */
function pickOption(label: string) {
  const option = screen
    .getAllByText(label)
    .map((el) => el.closest("[role=option]"))
    .find((el): el is HTMLElement => !!el);
  if (!option) throw new Error(`option ${label} not found`);
  fireEvent.click(option);
}

/** Clicks a class row (the onChange handler sits on the row's inner button). */
function pickClass(label: string) {
  const option = screen
    .getAllByText(label)
    .map((el) => el.closest("[role=option]"))
    .find((el): el is HTMLElement => !!el);
  if (!option) throw new Error(`class option ${label} not found`);
  const button = option.querySelector("button");
  if (!button) throw new Error(`class option ${label} has no button`);
  fireEvent.click(button);
}

function searchBox() {
  return screen.getByRole("textbox", { name: "languageCheck.topics.search" });
}

describe("TopicLibrary filters", () => {
  it("lists every visible topic by default", () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    expect(screen.getByText("Climate essay")).toBeTruthy();
    expect(screen.getByText("Speech task")).toBeTruthy();
    expect(screen.getByText("Personal task")).toBeTruthy();
  });

  it("search narrows by title and topic text, with a no-match state", () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.change(searchBox(), { target: { value: "climate" } });
    expect(screen.getByText("Climate essay")).toBeTruthy();
    expect(screen.queryByText("Speech task")).toBeNull();
    expect(screen.queryByText("Personal task")).toBeNull();
    fireEvent.change(searchBox(), { target: { value: "zzz-nothing" } });
    expect(screen.getByText("languageCheck.topics.emptyFilter")).toBeTruthy();
  });

  it("search matches the class name too", () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.change(searchBox(), { target: { value: "Gp1" } });
    expect(screen.getByText("Climate essay")).toBeTruthy();
    expect(screen.getByText("Speech task")).toBeTruthy();
    expect(screen.queryByText("Personal task")).toBeNull();
  });

  it("picking a class narrows to that class's topics", async () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    await openClassFilter();
    pickClass("S5 · English · Gp1");
    expect(screen.getByText("Climate essay")).toBeTruthy();
    expect(screen.getByText("Speech task")).toBeTruthy();
    expect(screen.queryByText("Personal task")).toBeNull();
  });

  it("a class with no topics shows the no-match state", async () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    await openClassFilter();
    pickClass("S6 · English · Gp2");
    expect(screen.getByText("languageCheck.topics.emptyFilter")).toBeTruthy();
  });

  it("the no-class option shows only personal topics", async () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    await openClassFilter();
    pickOption("languageCheck.topics.noneClass");
    expect(screen.getByText("Personal task")).toBeTruthy();
    expect(screen.queryByText("Climate essay")).toBeNull();
    expect(screen.queryByText("Speech task")).toBeNull();
  });

  it("all classes restores the full list", async () => {
    render(<TopicLibrary onUseTopic={() => {}} />);
    await openClassFilter();
    pickClass("S6 · English · Gp2");
    expect(screen.getByText("languageCheck.topics.emptyFilter")).toBeTruthy();
    await openClassFilter();
    pickOption("languageCheck.topics.allClasses");
    expect(screen.getByText("Climate essay")).toBeTruthy();
    expect(screen.getByText("Speech task")).toBeTruthy();
    expect(screen.getByText("Personal task")).toBeTruthy();
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import TopicLibrary from "./TopicLibrary";
import { useLanguageCheckStore } from "@/store/languageCheck";

// Regression tests for the Topic Library filter: a class pick and a word
// search (title, topic text or class name) narrow the list client-side,
// with a distinct "no match" empty state — plus who gets edit/delete.

// Mutable so a test can sit in a different role.
const viewer = { current: { id: "u1", role: "teacher" } };

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: viewer.current } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts
        ? `${key}|${Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(",")}`
        : key,
  }),
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
  viewer.current = { id: "u1", role: "teacher" };
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
    if (/^\/api\/writing-assessment\/topics\/[^/]+$/.test(url.pathname)) {
      return { ok: true, json: async () => ({ success: true }) } as Response;
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

  it("Use for upload hands the chosen topic to onUseTopic", () => {
    const onUseTopic = vi.fn();
    render(<TopicLibrary onUseTopic={onUseTopic} />);
    // One "Use for upload" per topic; the first row is TOPICS[0].
    fireEvent.click(screen.getAllByText("languageCheck.topics.use")[0]);
    expect(onUseTopic).toHaveBeenCalledTimes(1);
    expect(onUseTopic).toHaveBeenCalledWith(TOPICS[0]);
  });
});

/** The library row (`<li>`) that shows a topic title. */
function row(title: string): HTMLElement {
  const li = screen.getByText(title).closest("li");
  if (!li) throw new Error(`row ${title} not found`);
  return li;
}

function action(title: string, name: "edit" | "delete"): HTMLElement | null {
  return row(title).querySelector(`[title="languageCheck.topics.${name}"]`);
}

describe("TopicLibrary manage rights", () => {
  // TOPICS: "Climate essay" + "Personal task" are u1's; "Speech task" is
  // u2's (created for class c1).
  it.each(["teacher", "student"])(
    "offers edit/delete on the %s's own topics only",
    (role) => {
      viewer.current = { id: "u1", role };
      render(<TopicLibrary onUseTopic={() => {}} />);
      expect(action("Climate essay", "edit")).not.toBeNull();
      expect(action("Personal task", "delete")).not.toBeNull();
      expect(action("Speech task", "edit")).toBeNull();
      expect(action("Speech task", "delete")).toBeNull();
    },
  );

  it.each(["admin", "super-admin"])(
    "offers edit/delete on every listed topic to an %s",
    (role) => {
      viewer.current = { id: "u1", role };
      render(<TopicLibrary onUseTopic={() => {}} />);
      for (const title of ["Climate essay", "Speech task", "Personal task"]) {
        expect(action(title, "edit")).not.toBeNull();
        expect(action(title, "delete")).not.toBeNull();
      }
    },
  );

  it("opens another user's topic in the edit form for an admin", async () => {
    viewer.current = { id: "u1", role: "admin" };
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.click(action("Speech task", "edit")!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("languageCheck.topics.form.editTitle")).toBeTruthy();
    expect(
      (within(dialog).getByLabelText(/^languageCheck\.topics\.form\.title/) as HTMLInputElement)
        .value,
    ).toBe("Speech task");
  });

  it("tells an admin that deleting someone else's topic removes it for everyone", async () => {
    viewer.current = { id: "u1", role: "admin" };
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.click(action("Speech task", "delete")!);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "languageCheck.topics.deleteDescOthers|title=Speech task,name=Ms Chan",
      ),
    ).toBeTruthy();
    expect(within(dialog).queryByText(/^languageCheck\.topics\.deleteDesc\|/)).toBeNull();
  });

  it("keeps the plain confirmation when an admin deletes their own topic", async () => {
    viewer.current = { id: "u1", role: "admin" };
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.click(action("Climate essay", "delete")!);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("languageCheck.topics.deleteDesc|title=Climate essay"),
    ).toBeTruthy();
    expect(within(dialog).queryByText(/^languageCheck\.topics\.deleteDescOthers/)).toBeNull();
  });

  it("deletes another user's topic as an admin", async () => {
    viewer.current = { id: "u1", role: "admin" };
    render(<TopicLibrary onUseTopic={() => {}} />);
    fireEvent.click(action("Speech task", "delete")!);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByText("languageCheck.topics.delete"));
    await waitFor(() => expect(screen.queryByText("Speech task")).toBeNull());
    // DELETE /api/writing-assessment/topics/[id] for the other user's topic.
    const calls = vi.mocked(fetch).mock.calls;
    expect(
      calls.some(
        ([url, init]) =>
          String(url) === "/api/writing-assessment/topics/b" &&
          (init as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(true);
    // The library still shows the admin's own topics.
    expect(screen.getByText("Climate essay")).toBeTruthy();
  });
});

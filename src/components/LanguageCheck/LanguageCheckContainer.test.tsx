import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import LanguageCheckContainer from "./LanguageCheckContainer";
import { useLanguageCheckStore } from "@/store/languageCheck";

// Regression test for the explicit-pick gate: the "Choose files" block must
// follow whether a student (or "Myself") has been picked — NOT the result of
// the class-narrowed student fetch. A class that narrows to an empty list
// (no members, or members outside the admin's school scope) used to
// silently re-open the "Myself" default the gate exists to prevent.

// Mutable so individual tests can land on a different tab (e.g. the Topic
// Library, to exercise "Use for upload").
const searchParams = { current: new URLSearchParams("tab=essays") };

vi.mock("next/navigation", () => ({
  usePathname: () => "/writing-assessment",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  // Land on the essays tab so the upload card (and its pickers) render.
  useSearchParams: () => searchParams.current,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "admin-1", role: "admin" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string }) =>
      opts?.name !== undefined ? `${key}:${opts.name}` : key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

// The container imports the PDF parser for staged uploads; pdfjs-dist needs
// browser globals (DOMMatrix) jsdom lacks, and this suite never parses PDFs.
vi.mock("@/utils/parser/pdfParser", () => ({ processPdfFile: vi.fn() }));

// Staging pages runs the image pipeline (canvas) which jsdom lacks — stub it
// with tiny data URLs so files reach the staging tray unchanged.
vi.mock("@/utils/image", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downscaleImage: vi.fn(async () => "data:image/jpeg;base64,tiny"),
  readFileAsDataURL: vi.fn(async () => "data:image/png;base64,tiny"),
}));

const CLASSES: ClassInfo[] = [
  { id: "c-mine", name: "My Class", teacherId: "admin-1", createdAt: 0 },
  // In the same school (so it lists for the admin) but not taught by them,
  // and its student fetch comes back empty — the reported scenario.
  { id: "c-empty", name: "Empty Class", teacherId: "someone-else", createdAt: 0 },
  // The class-targeted topic's class, for the mismatch-warning tests.
  { id: "c-topic", name: "Topic Class", teacherId: "admin-1", createdAt: 0 },
];

const AMY: LanguageCheckStaffUser = {
  id: "s1",
  name: "Amy Wong",
  email: "amy@example.com",
};

const CLASS_TOPIC: LanguageCheckTopicSummary = {
  id: "topic-class",
  title: "Class task",
  topic: "Write about your weekend",
  essayType: "dse-part-a",
  hasQuestionImage: false,
  userId: "admin-1",
  classId: "c-mine",
  className: "My Class",
  creatorName: null,
  createdAt: 0,
  updatedAt: 0,
};

// Members of the topic's class (c-topic); each mismatch test sets who it
// contains. Default: some other student, so Amy is NOT a member.
const topicClassMembers = { current: [{ studentId: "someone-else" }] };

const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
  const u = String(url);
  if (u.includes("/api/classes/c-topic/members")) {
    return { ok: true, json: async () => topicClassMembers.current } as Response;
  }
  if (u.includes("/api/classes")) {
    return { ok: true, json: async () => CLASSES } as Response;
  }
  if (u.includes("staff/students")) {
    // The admin's own classes / the scope-wide check have students; the
    // picked-but-not-taught class narrows to none.
    const users = u.includes("classId=c-empty") ? [] : [AMY];
    return { ok: true, json: async () => ({ users }) } as Response;
  }
  return { ok: false, status: 404 } as Response;
});

// jsdom shims for the comboboxes / pointer probing
beforeEach(() => {
  // Toast spies persist across tests; the mismatch tests assert negative
  // cases, so stale calls from earlier tests must not leak in.
  vi.clearAllMocks();
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  Element.prototype.scrollIntoView ??= () => {};
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
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  searchParams.current = new URLSearchParams("tab=essays");
  topicClassMembers.current = [{ studentId: "someone-else" }];
  // handleFiles tags staged pages with crypto.randomUUID; provide it when
  // the jsdom build lacks it.
  if (!globalThis.crypto.randomUUID) {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: () => "uuid-1",
    });
  }
  useLanguageCheckStore.setState({
    essays: [],
    listLoading: false,
    listLoaded: true,
    topics: [],
    topicsLoaded: true,
    topicsLoading: false,
    selectedTopicId: "topic-1", // topic is NOT the blocker here
    active: null,
    activeLoading: false,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const chooseFiles = () =>
  screen.getByRole("button", { name: "languageCheck.upload.choose" }) as HTMLButtonElement;

/** Combobox triggers are identified by their current visible label — the
 *  TopicPicker also renders a combobox, so index-based selection is fragile. */
const comboboxByLabel = (label: string) => {
  const btn = screen
    .getAllByRole("combobox")
    .find((b) => (b.textContent ?? "").includes(label));
  if (!btn) throw new Error(`combobox with label ${label} not found`);
  return btn;
};

describe("LanguageCheckContainer explicit-pick gate", () => {
  it("keeps upload blocked when the picked class narrows to an empty student list", async () => {
    render(<LanguageCheckContainer />);
    // Default (My Classes — the admin teaches one) + the scope-wide seed
    // both report students, so the unpicked gate is closed.
    await waitFor(() => expect(chooseFiles().disabled).toBe(true));

    // Switch to a class the admin does not teach → its student list is empty.
    fireEvent.click(comboboxByLabel("classCombobox.mine"));
    fireEvent.click(await screen.findByText(/Empty Class/));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("classId=c-empty"),
        expect.anything(),
      ),
    );
    // The narrowed list really came back empty…
    fireEvent.click(comboboxByLabel("languageCheck.upload.studentPlaceholder"));
    expect(await screen.findByText("languageCheck.staff.noStudents")).toBeTruthy();
    // …yet the pick is still required — the empty class list must not
    // silently re-open the "Myself" default.
    expect(chooseFiles().disabled).toBe(true);
  });

  it("re-enables upload once Myself is explicitly chosen", async () => {
    render(<LanguageCheckContainer />);
    await waitFor(() => expect(chooseFiles().disabled).toBe(true));

    // "Myself" is the pinned opt-in of the student dropdown.
    fireEvent.click(comboboxByLabel("languageCheck.upload.studentPlaceholder"));
    fireEvent.click(await screen.findByText("languageCheck.upload.forMyself"));
    expect(chooseFiles().disabled).toBe(false);
  });
});

// Regression tests for the topic-driven class scoping: choosing a topic with
// a class target (Topic Picker, or "Use for upload" in the Topic Library)
// must adopt that class in the "Check an essay for" dropdown, so the student
// picker is already narrowed to the topic's class. Both paths funnel through
// the same container handler; these tests drive the Library route (a plain
// button in jsdom, unlike the Topic Picker's Radix Select).
describe("LanguageCheckContainer topic class auto-scoping", () => {
  it("Use for upload scopes the student picker to the topic's class", async () => {
    searchParams.current = new URLSearchParams("tab=topics");
    useLanguageCheckStore.setState({
      topics: [CLASS_TOPIC],
      topicsLoaded: true,
      selectedTopicId: null,
    });
    render(<LanguageCheckContainer />);

    // The class dropdown adopts the topic's class → the student fetch
    // narrows to it.
    fireEvent.click(screen.getAllByText("languageCheck.topics.use")[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("classId=c-mine"),
        expect.anything(),
      ),
    );
  });

  it("a personal topic does not narrow the student picker to a class", async () => {
    searchParams.current = new URLSearchParams("tab=topics");
    useLanguageCheckStore.setState({
      topics: [
        { ...CLASS_TOPIC, id: "topic-personal", classId: null, className: null },
      ],
      topicsLoaded: true,
      selectedTopicId: null,
    });
    render(<LanguageCheckContainer />);

    fireEvent.click(screen.getAllByText("languageCheck.topics.use")[0]);
    await waitFor(() => {
      const studentFetches = fetchMock.mock.calls.filter(([u]) =>
        String(u).includes("staff/students"),
      );
      expect(studentFetches.length).toBeGreaterThan(0);
      expect(
        studentFetches.every(([u]) => !String(u).includes("classId=")),
      ).toBe(true);
    });
  });
});

// Regression tests for the topic-class mismatch confirmation: a
// class-targeted topic + a picked student from ANOTHER class (possible only
// via a manual class-dropdown override) must pause behind a confirmation —
// the upload may not begin until the teacher confirms the pairing.
describe("LanguageCheckContainer topic-class mismatch confirmation", () => {
  const MISMATCH_TOPIC: LanguageCheckTopicSummary = {
    ...CLASS_TOPIC,
    id: "topic-c",
    classId: "c-topic",
    className: "Topic Class",
  };

  const postAttempted = () =>
    fetchMock.mock.calls.some(
      ([u, init]) =>
        String(u) === "/api/writing-assessment" &&
        (init as RequestInit | undefined)?.method === "POST",
    );

  const triggerText = (el: HTMLElement) => el.textContent ?? "";

  /** Clicks a combobox row until the pick registers on the trigger. The
   *  staff pickers re-render while their scoped student fetches resolve,
   *  and a click landing between two commits hits a detached row and is
   *  silently swallowed — waitFor's retries make it deterministic. */
  async function pickRow(trigger: HTMLElement, optionLabel: string, appliedLabel: string) {
    await waitFor(async () => {
      if (triggerText(trigger).includes(appliedLabel)) return;
      fireEvent.click((await screen.findAllByText(optionLabel))[0]);
      if (!triggerText(trigger).includes(appliedLabel)) {
        throw new Error("pick not applied yet");
      }
    });
  }

  /** Reaches handleStart: picks Amy (lifting the explicit-pick gate), stages
   *  one page through the file input and presses the tray's start button. */
  async function pickAmyAndStart() {
    const studentTrigger = comboboxByLabel("languageCheck.upload.studentPlaceholder");
    fireEvent.click(studentTrigger); // open once; only the row click retries
    await pickRow(studentTrigger, "Amy Wong", "Amy Wong");
    await waitFor(() => expect(chooseFiles().disabled).toBe(false));
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "page.png", { type: "image/png" })] },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "languageCheck.staging.start" }),
    );
  }

  it("pauses the upload behind a confirmation when the student is outside the topic's class", async () => {
    useLanguageCheckStore.setState({
      topics: [MISMATCH_TOPIC],
      topicsLoaded: true,
      selectedTopicId: "topic-c",
    });
    render(<LanguageCheckContainer />);

    // The class filter ("My Classes") no longer matches the topic's class,
    // and the fetched roster does not contain Amy → confirmation, no upload.
    await pickAmyAndStart();
    expect(postAttempted()).toBe(false);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(
      screen.getByText("languageCheck.upload.topicClassMismatch:Amy Wong"),
    ).toBeTruthy();
    // Confirming proceeds with the upload.
    fireEvent.click(
      screen.getByRole("button", { name: "languageCheck.upload.uploadAnyway" }),
    );
    await waitFor(() => expect(postAttempted()).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not upload when the confirmation is cancelled", async () => {
    useLanguageCheckStore.setState({
      topics: [MISMATCH_TOPIC],
      topicsLoaded: true,
      selectedTopicId: "topic-c",
    });
    render(<LanguageCheckContainer />);

    await pickAmyAndStart();
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "languageCheck.cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(postAttempted()).toBe(false);
    // The staged tray survives so the teacher can fix the pick and restart.
    expect(
      screen.getByRole("button", { name: "languageCheck.staging.start" }),
    ).toBeTruthy();
  });

  it("uploads straight away when the picked student is in the topic's class", async () => {
    topicClassMembers.current = [{ studentId: "s1" }]; // Amy IS a member
    useLanguageCheckStore.setState({
      topics: [MISMATCH_TOPIC],
      topicsLoaded: true,
      selectedTopicId: "topic-c",
    });
    render(<LanguageCheckContainer />);

    await pickAmyAndStart();
    await waitFor(() => expect(postAttempted()).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("skips the roster fetch when the class filter matches the topic's class", async () => {
    useLanguageCheckStore.setState({
      topics: [MISMATCH_TOPIC],
      topicsLoaded: true,
      selectedTopicId: "topic-c",
    });
    render(<LanguageCheckContainer />);

    // Align the class filter with the topic's class: the student list was
    // then fetched FOR that class, so membership is already guaranteed.
    // Wait for the "My Classes" default adoption first — until the classes
    // fetch lands, the trigger still reads "All Classes".
    await waitFor(() => expect(comboboxByLabel("classCombobox.mine")).toBeTruthy());
    const classTrigger = comboboxByLabel("classCombobox.mine");
    fireEvent.click(classTrigger); // open once; only the row click retries
    await pickRow(classTrigger, "Topic Class", "Topic Class");
    await pickAmyAndStart();
    await waitFor(() => expect(postAttempted()).toBe(true));
    expect(
      fetchMock.mock.calls.some(([u]) =>
        String(u).includes("/api/classes/c-topic/members"),
      ),
    ).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

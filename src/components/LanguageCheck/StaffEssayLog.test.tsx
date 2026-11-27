import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, within } from "@testing-library/react";
import { toast } from "sonner";
import StaffEssayLog from "./StaffEssayLog";
import { useLanguageCheckStore } from "@/store/languageCheck";

// Regression tests for the Student essays filters. Class and student now come
// from the shared staff filter bar as props; topic and status are local. Every
// filter must fire a narrowed request, and narrow BOTH the table rows and the
// stats cards.

// Mutable session role: the delete affordance is admin / super-admin only.
const { sessionState } = vi.hoisted(() => ({
  sessionState: { role: "teacher" as string },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: sessionState.role } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// The check pipeline (AI calls, toasts, abort) is exercised elsewhere; here
// we only verify the dialog wiring: the button must fire runStaffCheck with
// the open essay and refresh everything afterwards.
const { runStaffCheckSpy } = vi.hoisted(() => ({
  runStaffCheckSpy: vi.fn(),
}));

vi.mock("@/hooks/useLanguageCheck", () => ({
  default: () => ({
    runStaffCheck: runStaffCheckSpy,
    assessLanguage: vi.fn(),
  }),
}));

interface FixtureRow {
  id: string;
  userId: string;
  userName: string;
  title: string;
  status: string;
  topicId: string | null;
  topicTitle: string | null;
}

const ALL_ROWS: FixtureRow[] = [
  { id: "e1", userId: "alice", userName: "Alice", title: "Alice essay", status: "checked", topicId: "topic-1", topicTitle: "S6 Writing 1" },
  { id: "e2", userId: "bob", userName: "Bob", title: "Bob essay", status: "draft", topicId: "topic-gone", topicTitle: null },
];

/** Rows the mocked list answers with (reset to ALL_ROWS before each test). */
let rowsFixture: FixtureRow[];

const ALL_TOPICS: LanguageCheckStaffTopic[] = [
  { id: "topic-1", title: "S6 Writing 1" },
];

/** The caller's Topic Library (GET /api/writing-assessment/topics). */
const LIBRARY_TOPICS: LanguageCheckStaffTopic[] = [
  { id: "topic-1", title: "S6 Writing 1" },
  { id: "topic-2", title: "S7 Writing" },
];

const staffRequests: string[] = [];
const detailRequests: string[] = [];
/** PATCH /api/writing-assessment/staff/:id captures (title rename). */
const renameRequests: { id: string; body: unknown }[] = [];
/** PUT /api/writing-assessment/staff/:id/topic captures (topic re-link). */
const relinkRequests: { id: string; body: unknown }[] = [];
/** DELETE /api/writing-assessment/staff/:id captures (admin essay delete). */
const deleteRequests: string[] = [];
/** When true, the staff DELETE answers 500. */
let deleteFails = false;
/** GET /api/writing-assessment — the caller's own essay list refresh. */
let ownListRequests = 0;

/** Mutable staff detail fixture (view dialog), re-set in beforeEach. */
let detailFixture: Record<string, unknown>;

function makeDetail(): Record<string, unknown> {
  return {
    id: "e1",
    userId: "alice",
    userName: "Alice",
    userEmail: "alice@example.com",
    title: "Alice essay",
    status: "checked",
    pageCount: 1,
    errorCount: 1,
    overall: null,
    wordCount: 4,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    transcript: "He go to school.",
    checkedText: "He go to school.",
    corrections: [
      {
        id: "c1",
        start: 0,
        end: 2,
        original: "He",
        correction: "He goes",
        category: "subject-verb-agreement",
        explanation: "Third person singular takes -s.",
        explanationZh: "第三人稱單數動詞要加 s。",
      },
    ],
    ocrModel: "gpt-6-luna",
    checkModel: "gpt-6.1-sol",
    droppedCount: 0,
    assessment: null,
  };
}

function staffResponse(url: URL) {
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");
  const classId = url.searchParams.get("classId");
  const topicId = url.searchParams.get("topicId");
  // Like the real list route: `rows` is the requested page only, `total`
  // the size of the whole filtered set.
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
  const rows = rowsFixture.filter(
    (r) =>
      (!userId || r.userId === userId) &&
      (!status || r.status === status) &&
      (!topicId || r.topicId === topicId) &&
      (!classId || r.userId === "alice"), // pretend class contains Alice
  );
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize).map((r, i) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userEmail: `${r.userId}@example.com`,
      title: r.title,
      status: r.status,
      topicId: r.topicId,
      topicTitle: r.topicTitle,
      pageCount: 1,
      errorCount: i,
      overall: null,
      wordCount: 10 + i,
      createdAt: 0,
      updatedAt: 0,
    })),
    total: rows.length,
    stats: {
      total: rows.length,
      students: new Set(rows.map((r) => r.userId)).size,
      topics: new Set(
        rows.filter((r) => r.topicId).map((r) => r.topicId),
      ).size,
      avgOverall: null,
    },
    topics: ALL_TOPICS,
  };
}

beforeEach(() => {
  sessionState.role = "teacher";
  rowsFixture = [...ALL_ROWS];
  staffRequests.length = 0;
  detailRequests.length = 0;
  renameRequests.length = 0;
  relinkRequests.length = 0;
  deleteRequests.length = 0;
  deleteFails = false;
  ownListRequests = 0;
  detailFixture = makeDetail();
  runStaffCheckSpy.mockReset();
  runStaffCheckSpy.mockResolvedValue(true);
  // cmdk needs ResizeObserver, absent in jsdom
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // Radix Select/Popover jsdom shims
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
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/classes") {
      return {
        ok: true,
        json: async () => [
          { id: "class-1", name: "Gp1", subjectName: "English", gradeName: "S5" },
        ],
      } as Response;
    }
    if (url.pathname === "/api/writing-assessment/staff") {
      staffRequests.push(url.searchParams.toString());
      return {
        ok: true,
        json: async () => staffResponse(url),
      } as Response;
    }
    // Staff detail (view dialog) — exact match wins over the [id] prefix.
    const detailMatch = url.pathname.match(
      /^\/api\/writing-assessment\/staff\/([^/]+)$/,
    );
    if (detailMatch) {
      // Title rename from the table (staff PATCH).
      if (init?.method === "PATCH") {
        renameRequests.push({
          id: detailMatch[1],
          body: JSON.parse(String(init.body)),
        });
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      // Admin delete from the table (staff DELETE). Like the server, a
      // successful delete makes the row disappear from later list reads.
      if (init?.method === "DELETE") {
        deleteRequests.push(detailMatch[1]);
        if (deleteFails) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: "delete failed" }),
          } as Response;
        }
        rowsFixture = rowsFixture.filter((r) => r.id !== detailMatch[1]);
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      detailRequests.push(detailMatch[1]);
      return {
        ok: true,
        json: async () => detailFixture,
      } as Response;
    }
    // Topic re-link from the table (staff PUT).
    const relinkMatch = url.pathname.match(
      /^\/api\/writing-assessment\/staff\/([^/]+)\/topic$/,
    );
    if (relinkMatch && init?.method === "PUT") {
      relinkRequests.push({
        id: relinkMatch[1],
        body: JSON.parse(String(init.body)),
      });
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }
    // The caller's Topic Library (re-link picker options).
    if (url.pathname === "/api/writing-assessment/topics") {
      return {
        ok: true,
        json: async () => LIBRARY_TOPICS,
      } as Response;
    }
    // The caller's own essay list (languageCheck store loadList refresh).
    if (url.pathname === "/api/writing-assessment") {
      ownListRequests++;
      return { ok: true, json: async () => [] } as Response;
    }
    throw new Error(`unexpected fetch: ${url.pathname}`);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Generation flags set by the delete tests must not leak into the next one.
  useLanguageCheckStore.setState({
    activeGenerations: {},
    generatingEssayId: null,
  });
});

/** Stat card value shown under its label (e.g. statEssays → "2"). The Stat
 *  card's first <p> is the label; the value <p> carries tabular-nums. */
function statValue(label: string): string {
  const card = screen.getByText(label).closest("div");
  if (!card) throw new Error(`stat card ${label} not found`);
  return card.querySelector("p.tabular-nums")?.textContent ?? "";
}

async function chooseStatus(label: string) {
  const trigger = screen.getByRole("combobox", {
    name: "languageCheck.staff.filterStatus",
  });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
  const option = await waitFor(() => {
    const matches = screen
      .getAllByText(label)
      .filter((el) => el.closest("[role=option]") !== null);
    expect(matches.length).toBeGreaterThan(0);
    return matches[0];
  });
  fireEvent.click(option);
}

/** Picks a writing topic from the searchable topic dropdown. */
async function chooseTopic(label: string) {
  const trigger = screen.getByRole("combobox", {
    name: "languageCheck.staff.filterTopic",
  });
  fireEvent.click(trigger);
  const option = await waitFor(() => {
    const matches = screen
      .getAllByText(label)
      .filter((el) => el.closest("[role=option]") !== null);
    expect(matches.length).toBeGreaterThan(0);
    return matches[0];
  });
  fireEvent.click(option);
}

describe("StaffEssayLog filters", () => {
  it("a shared student selection narrows the table and the stats cards", async () => {
    const { rerender } = render(<StaffEssayLog classId={null} userId={null} />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.getByText("Bob essay")).toBeTruthy();
    });
    expect(statValue("languageCheck.staff.statEssays")).toBe("2");
    const before = staffRequests.length;

    rerender(<StaffEssayLog classId={null} userId="alice" />);

    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
      expect(staffRequests[staffRequests.length - 1]).toContain("userId=alice");
    });
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.queryByText("Bob essay")).toBeNull();
      expect(statValue("languageCheck.staff.statEssays")).toBe("1");
      expect(statValue("languageCheck.staff.statStudents")).toBe("1");
    });
  });

  it("a shared class selection is sent to the API", async () => {
    render(<StaffEssayLog classId="class-1" userId={null} />);
    await waitFor(() => {
      expect(staffRequests[staffRequests.length - 1]).toContain("classId=class-1");
    });
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.queryByText("Bob essay")).toBeNull();
    });
  });

  it("the '__mine__' selection (My Classes) travels as mine=1, not classId", async () => {
    render(<StaffEssayLog classId="__mine__" userId={null} />);
    await waitFor(() => {
      const last = staffRequests[staffRequests.length - 1];
      expect(last).toContain("mine=1");
      expect(last).not.toContain("classId=");
    });
  });

  it("picking a status narrows the table and the stats cards", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.getByText("Bob essay")).toBeTruthy();
    });
    const before = staffRequests.length;

    await chooseStatus("languageCheck.list.status.checked");

    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
      expect(staffRequests[staffRequests.length - 1]).toContain("status=checked");
    });
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.queryByText("Bob essay")).toBeNull();
      expect(statValue("languageCheck.staff.statEssays")).toBe("1");
      expect(statValue("languageCheck.staff.statTopics")).toBe("1");
    });
  });

  it("picking a topic narrows the table and returns to the first page", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.getByText("Bob essay")).toBeTruthy();
    });
    const before = staffRequests.length;

    await chooseTopic("S6 Writing 1");

    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
      const last = staffRequests[staffRequests.length - 1];
      expect(last).toContain("topicId=topic-1");
      expect(last).toContain("page=1");
    });
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.queryByText("Bob essay")).toBeNull();
    });
  });

  it("clicking a sortable column header re-fetches with sort params", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());

    // Student: first click = ascending, second click flips to descending.
    const studentHeader = screen.getByRole("button", {
      name: /languageCheck\.staff\.colStudent/,
    });
    fireEvent.click(studentHeader);
    await waitFor(() => {
      expect(staffRequests[staffRequests.length - 1]).toContain(
        "sort=student&order=asc",
      );
    });
    fireEvent.click(studentHeader);
    await waitFor(() => {
      expect(staffRequests[staffRequests.length - 1]).toContain(
        "sort=student&order=desc",
      );
    });

    // Overall defaults to descending (best first); not-assessed stay last.
    fireEvent.click(
      screen.getByRole("button", {
        name: /languageCheck\.assessment\.overall/,
      }),
    );
    await waitFor(() => {
      expect(staffRequests[staffRequests.length - 1]).toContain(
        "sort=overall&order=desc",
      );
    });
  });

  it("changing the shared selection returns to the first page", async () => {
    const { rerender } = render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    rerender(<StaffEssayLog classId={null} userId="bob" />);
    await waitFor(() => {
      expect(staffRequests[staffRequests.length - 1]).toContain("page=1");
    });
  });
});

describe("StaffEssayLog view dialog re-check", () => {
  /** The View button of the table row whose title cell is `title`. */
  function viewButtonForRow(title: string): HTMLButtonElement {
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    // By accessible name, NOT querySelector("button") — the Title column's
    // rename (pencil) button now precedes View in the DOM.
    const button = within(row).getByRole("button", {
      name: "languageCheck.staff.view",
    });
    return button as HTMLButtonElement;
  }

  function buttonByText(label: string): HTMLButtonElement {
    const el = screen.getByText(label).closest("button");
    if (!el) throw new Error(`button ${label} not found`);
    return el as HTMLButtonElement;
  }

  /** Opens the dialog and waits for the check button to appear. */
  async function openDialog(label: string) {
    fireEvent.click(viewButtonForRow("Alice essay"));
    await screen.findByText(label);
  }

  it("Check again runs the staff check on the open essay, then refreshes", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    await openDialog("languageCheck.results.recheck");

    const listBefore = staffRequests.length;
    const detailBefore = detailRequests.length;
    fireEvent.click(buttonByText("languageCheck.results.recheck"));

    await waitFor(() => expect(runStaffCheckSpy).toHaveBeenCalledTimes(1));
    expect(runStaffCheckSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "e1",
        transcript: "He go to school.",
      }),
    );
    // A finished re-check re-fetches the dialog AND the table.
    await waitFor(() => {
      expect(detailRequests.length).toBeGreaterThan(detailBefore);
      expect(staffRequests.length).toBeGreaterThan(listBefore);
    });
  });

  it("disables Check again for essays past the retention window", async () => {
    detailFixture = { ...makeDetail(), createdAt: 0 };
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    await openDialog("languageCheck.results.recheck");

    const button = buttonByText("languageCheck.results.recheck");
    expect(button.disabled).toBe(true);
    expect(button.title).toBe("languageCheck.results.expiredDisabled");
    expect(runStaffCheckSpy).not.toHaveBeenCalled();
  });

  it("disables the check when there is no transcript to check", async () => {
    detailFixture = {
      ...makeDetail(),
      status: "draft",
      transcript: "",
      checkedText: "",
      corrections: [],
    };
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    // Unchecked essay: the button offers a first check instead.
    await openDialog("languageCheck.review.runCheck");

    const button = buttonByText("languageCheck.review.runCheck");
    expect(button.disabled).toBe(true);
    expect(button.title).toBe("languageCheck.check.noText");
    expect(runStaffCheckSpy).not.toHaveBeenCalled();
  });
});

describe("StaffEssayLog view dialog stays open when the Export dialog closes", () => {
  /** The View button of the table row whose title cell is `title`. */
  function viewButtonForRow(title: string): HTMLButtonElement {
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    const button = within(row).getByRole("button", {
      name: "languageCheck.staff.view",
    });
    return button as HTMLButtonElement;
  }

  /** Opens the view dialog, then the Export dialog on top of it. */
  async function openExportDialog() {
    fireEvent.click(viewButtonForRow("Alice essay"));
    await screen.findByText("languageCheck.results.recheck");
    fireEvent.click(
      screen.getByRole("button", { name: "languageCheck.results.export" }),
    );
    await screen.findByText("languageCheck.exportDialog.title");
  }

  it("an outside interaction while the Export dialog is open never closes the view dialog", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    await openExportDialog();

    // A tap/click outside both dialogs (e.g. on the backdrop) belongs to the
    // Export dialog on top — the view dialog underneath must survive it.
    fireEvent.pointerDown(document.body, { button: 0 });
    await waitFor(() => {
      expect(screen.getByText("languageCheck.results.recheck")).toBeTruthy();
    });
  });

  it("ignores outside interactions whose target was removed from the DOM mid-event", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    fireEvent.click(viewButtonForRow("Alice essay"));
    await screen.findByText("languageCheck.results.recheck");

    // Touch race regression: on touch, Radix defers a dialog's
    // outside-pointer check to the following click, and a tap on the Export
    // dialog's Cancel/X unmounts that dialog inside the same click — so the
    // view dialog receives an "outside" interaction whose target has already
    // been removed from the DOM. Such stale interactions must be ignored.
    const scratch = document.createElement("div");
    document.body.appendChild(scratch);
    document.addEventListener(
      "pointerdown",
      () => scratch.remove(),
      { capture: true, once: true },
    );
    fireEvent.pointerDown(scratch, { button: 0 });
    await waitFor(() => {
      expect(screen.getByText("languageCheck.results.recheck")).toBeTruthy();
    });
  });

  it("a genuine outside pointerdown still closes the view dialog", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    fireEvent.click(viewButtonForRow("Alice essay"));
    await screen.findByText("languageCheck.results.recheck");

    fireEvent.pointerDown(document.body, { button: 0 });
    await waitFor(() => {
      expect(screen.queryByText("languageCheck.results.recheck")).toBeNull();
    });
  });
});

describe("StaffEssayLog title rename", () => {
  /** The rename (pencil) button inside the row titled `title`. */
  function renameButtonForRow(title: string): HTMLButtonElement {
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    const button = within(row).getByRole("button", {
      name: "languageCheck.staff.rename",
    });
    return button as HTMLButtonElement;
  }

  async function startRename(title: string): Promise<HTMLInputElement> {
    // Capture the row BEFORE the click — starting the rename replaces the
    // title span with the input, so getByText(title) would no longer match.
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    fireEvent.click(renameButtonForRow(title));
    return await waitFor(() => {
      const input = row.querySelector(
        'input[aria-label="languageCheck.staff.rename"]',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      return input as HTMLInputElement;
    });
  }

  it("renames a row in place via the staff PATCH endpoint", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());

    const input = await startRename("Alice essay");
    expect(input.value).toBe("Alice essay");
    fireEvent.change(input, { target: { value: "Alice retitled" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Enter blurs the input; fire blur explicitly too — commit is
    // idempotent, so a double fire must still PATCH exactly once.
    fireEvent.blur(input);

    await waitFor(() => {
      expect(renameRequests).toEqual([
        { id: "e1", body: { title: "Alice retitled" } },
      ]);
    });
    await waitFor(() => {
      expect(screen.getByText("Alice retitled")).toBeTruthy();
    });
  });

  it("Escape cancels the edit without a request", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());

    const input = await startRename("Alice essay");
    fireEvent.change(input, { target: { value: "Discarded" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);

    expect(renameRequests).toEqual([]);
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
    });
  });

  it("an unchanged or blank title is not sent", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());

    // Unchanged value → no request.
    let input = await startRename("Alice essay");
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(renameRequests).toEqual([]);

    // Blank value → no request (staff cannot blank a learner's title).
    input = await startRename("Alice essay");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(renameRequests).toEqual([]);
    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
    });
  });
});

describe("StaffEssayLog topic re-link", () => {
  /** The re-link (link) button inside the row titled `title`. */
  function relinkButtonForRow(title: string): HTMLButtonElement {
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    const button = within(row).getByRole("button", {
      name: "languageCheck.staff.relink",
    });
    return button as HTMLButtonElement;
  }

  it("unlinking sends a null topicId and refreshes the table", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    const before = staffRequests.length;

    fireEvent.click(relinkButtonForRow("Alice essay"));
    const trigger = await screen.findByRole("combobox", {
      name: "languageCheck.staff.relinkPick",
    });
    // The pinned "Remove topic" option emits null = unlink.
    fireEvent.click(trigger);
    const option = await waitFor(() => {
      const matches = screen
        .getAllByText("languageCheck.staff.unlink")
        .filter((el) => el.closest("[role=option]") !== null);
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    });
    fireEvent.click(option);
    // Save's label flips to "Remove topic" once the pick is null.
    fireEvent.click(
      screen.getByRole("button", { name: "languageCheck.staff.unlink" }),
    );

    await waitFor(() => {
      expect(relinkRequests).toEqual([
        { id: "e1", body: { topicId: null } },
      ]);
    });
    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
    });
  });

  it("re-links a row to a library topic and refreshes the table", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
    const before = staffRequests.length;

    fireEvent.click(relinkButtonForRow("Alice essay"));

    // The picker fetches the caller's Topic Library, preselects the current
    // link, and offers the other library topics.
    const trigger = await screen.findByRole("combobox", {
      name: "languageCheck.staff.relinkPick",
    });
    fireEvent.click(trigger);
    const option = await waitFor(() => {
      const matches = screen
        .getAllByText("S7 Writing")
        .filter((el) => el.closest("[role=option]") !== null);
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    });
    fireEvent.click(option);

    fireEvent.click(
      screen.getByRole("button", { name: "languageCheck.staff.relinkSave" }),
    );

    await waitFor(() => {
      expect(relinkRequests).toEqual([
        { id: "e1", body: { topicId: "topic-2" } },
      ]);
    });
    // The table re-fetches: the row's Topic column, the topic filter
    // options and the Topics stat card all depend on the new link.
    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
    });
  });

  it("Save stays disabled until a topic is picked", async () => {
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Bob essay")).toBeTruthy());

    // Bob's link is dangling (deleted topic) → nothing preselected.
    fireEvent.click(relinkButtonForRow("Bob essay"));
    const save = (await screen.findByRole("button", {
      name: "languageCheck.staff.relinkSave",
    })) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(relinkRequests).toEqual([]);
  });
});

describe("StaffEssayLog delete", () => {
  /** The trash button inside the row titled `title` (null = not offered). */
  function deleteButtonForRow(title: string): HTMLButtonElement | null {
    const row = screen.getByText(title).closest("tr");
    if (!row) throw new Error(`row ${title} not found`);
    return (within(row).queryByRole("button", {
      name: "languageCheck.staff.delete",
    }) ?? null) as HTMLButtonElement | null;
  }

  /** Renders as the given role and waits for the fixture rows. */
  async function renderAs(role: string) {
    sessionState.role = role;
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Alice essay")).toBeTruthy());
  }

  /** Opens the confirm dialog from `title`'s row and returns its buttons. */
  async function askToDelete(title: string) {
    fireEvent.click(deleteButtonForRow(title)!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("languageCheck.staff.deleteTitle")).toBeTruthy();
    expect(within(dialog).getByText("languageCheck.staff.deleteDesc")).toBeTruthy();
    return {
      confirm: within(dialog).getByRole("button", {
        name: "languageCheck.staff.delete",
      }) as HTMLButtonElement,
      cancel: within(dialog).getByRole("button", {
        name: "languageCheck.cancel",
      }) as HTMLButtonElement,
    };
  }

  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("teachers get no delete button — they can view, rename and re-link only", async () => {
    await renderAs("teacher");
    for (const title of ["Alice essay", "Bob essay"]) {
      expect(deleteButtonForRow(title)).toBeNull();
      // The affordances teachers DO have are untouched.
      expect(
        within(screen.getByText(title).closest("tr")!).getByRole("button", {
          name: "languageCheck.staff.rename",
        }),
      ).toBeTruthy();
    }
  });

  it.each(["admin", "super-admin"])("%s gets a delete button on every row", async (role) => {
    await renderAs(role);
    expect(deleteButtonForRow("Alice essay")).not.toBeNull();
    expect(deleteButtonForRow("Bob essay")).not.toBeNull();
  });

  it.each(["admin", "super-admin"])(
    "%s: confirming DELETEs the row, then refreshes the table and the caller's own essay list",
    async (role) => {
      await renderAs(role);
      const listBefore = staffRequests.length;
      const ownListBefore = ownListRequests;

      const { confirm } = await askToDelete("Alice essay");
      // Opening the dialog alone never deletes.
      expect(deleteRequests).toEqual([]);

      fireEvent.click(confirm);

      await waitFor(() => expect(deleteRequests).toEqual(["e1"]));
      await waitFor(() => expect(staffRequests.length).toBeGreaterThan(listBefore));
      await waitFor(() => expect(ownListRequests).toBeGreaterThan(ownListBefore));
      expect(toast.success).toHaveBeenCalledWith("languageCheck.staff.deleted");
      // The dialog is gone, Alice's row with it; Bob is untouched.
      await waitFor(() =>
        expect(screen.queryByText("languageCheck.staff.deleteTitle")).toBeNull(),
      );
      await waitFor(() => expect(screen.queryByText("Alice essay")).toBeNull());
      expect(screen.getByText("Bob essay")).toBeTruthy();
    },
  );

  it("Cancel closes the dialog without a request or a reload", async () => {
    await renderAs("admin");
    const listBefore = staffRequests.length;

    const { cancel } = await askToDelete("Bob essay");
    fireEvent.click(cancel);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).toBeNull(),
    );
    expect(deleteRequests).toEqual([]);
    expect(staffRequests).toHaveLength(listBefore);
    expect(screen.getByText("Bob essay")).toBeTruthy();
  });

  it("a failed delete keeps the row and the dialog, and reports the error", async () => {
    await renderAs("admin");
    const listBefore = staffRequests.length;
    deleteFails = true;

    const { confirm } = await askToDelete("Alice essay");
    fireEvent.click(confirm);

    await waitFor(() =>
      // parseError prefixes the message with the error's name.
      expect(toast.error).toHaveBeenCalledWith("[Error]: delete failed"),
    );
    expect(deleteRequests).toEqual(["e1"]);
    expect(toast.success).not.toHaveBeenCalled();
    // Still open (retry or cancel is the user's call), row still listed.
    expect(screen.getByText("languageCheck.staff.deleteTitle")).toBeTruthy();
    expect(screen.getByText("Alice essay")).toBeTruthy();
    expect(staffRequests).toHaveLength(listBefore);
    // The button is usable again after the failure.
    await waitFor(() => expect(confirm.disabled).toBe(false));
  });

  it("deleting the last row of a later page steps back to the previous page", async () => {
    // Twenty-one rows at the default twenty per page: page 1 holds
    // "Essay 0"…"Essay 19", page 2 the single row "Essay 20".
    rowsFixture = Array.from({ length: 21 }, (_, i) => ({
      id: `e${i}`,
      userId: "alice",
      userName: "Alice",
      title: `Essay ${i}`,
      status: "checked",
      topicId: null,
      topicTitle: null,
    }));
    sessionState.role = "admin";
    render(<StaffEssayLog classId={null} userId={null} />);
    await waitFor(() => expect(screen.getByText("Essay 0")).toBeTruthy());

    const pager = screen.getByText("languageCheck.staff.page").parentElement!;
    const nextButton = Array.from(pager.querySelectorAll("button")).pop()!;
    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(staffRequests[staffRequests.length - 1]).toContain("page=2"),
    );
    await waitFor(() => expect(screen.getByText("Essay 20")).toBeTruthy());

    const { confirm } = await askToDelete("Essay 20");
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteRequests).toEqual(["e20"]));

    // Page 2 no longer exists (twenty rows left) — the reload asks for page 1
    // instead of an empty page 2.
    await waitFor(() => {
      const last = staffRequests[staffRequests.length - 1];
      expect(last).toContain("page=1");
      expect(last).not.toContain("page=2");
    });
    await waitFor(() => expect(screen.getByText("Essay 0")).toBeTruthy());
    expect(screen.queryByText("Essay 20")).toBeNull();
  });

  it("waits for a marking that is running on that essay (other rows stay deletable)", async () => {
    useLanguageCheckStore.setState({
      generatingEssayId: "e1",
      activeGenerations: { "language-check": true },
    });
    await renderAs("admin");

    const alice = deleteButtonForRow("Alice essay")!;
    expect(alice.disabled).toBe(true);
    expect(alice.title).toBe("languageCheck.staff.deleteBusy");
    const bob = deleteButtonForRow("Bob essay")!;
    expect(bob.disabled).toBe(false);
    expect(bob.title).toBe("languageCheck.staff.delete");
  });
});

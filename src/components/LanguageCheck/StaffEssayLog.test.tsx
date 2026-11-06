import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import StaffEssayLog from "./StaffEssayLog";

// Regression tests for the Student essays filters. Class and student now come
// from the shared staff filter bar as props; status (and title search) are
// local. Every filter must fire a narrowed request, and narrow BOTH the table
// rows and the stats cards.

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: "teacher" } },
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
}

const ALL_ROWS: FixtureRow[] = [
  { id: "e1", userId: "alice", userName: "Alice", title: "Alice essay", status: "checked" },
  { id: "e2", userId: "bob", userName: "Bob", title: "Bob essay", status: "draft" },
];

const staffRequests: string[] = [];
const detailRequests: string[] = [];

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
  const rows = ALL_ROWS.filter(
    (r) =>
      (!userId || r.userId === userId) &&
      (!status || r.status === status) &&
      (!classId || r.userId === "alice"), // pretend class contains Alice
  );
  return {
    rows: rows.map((r, i) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userEmail: `${r.userId}@example.com`,
      title: r.title,
      status: r.status,
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
      checked: rows.filter((r) => r.status === "checked").length,
      transcribed: 0,
      draft: rows.filter((r) => r.status === "draft").length,
      students: new Set(rows.map((r) => r.userId)).size,
      pages: rows.length,
      corrections: 0,
    },
  };
}

beforeEach(() => {
  staffRequests.length = 0;
  detailRequests.length = 0;
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
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/classes") {
      return {
        ok: true,
        json: async () => [
          { id: "class-1", name: "Gp1", subjectName: "English", gradeName: "S5" },
        ],
      } as Response;
    }
    if (url.pathname === "/api/grammar-check/staff") {
      staffRequests.push(url.searchParams.toString());
      return {
        ok: true,
        json: async () => staffResponse(url),
      } as Response;
    }
    // Staff detail (view dialog) — exact match wins over the [id] prefix.
    const detailMatch = url.pathname.match(
      /^\/api\/grammar-check\/staff\/([^/]+)$/,
    );
    if (detailMatch) {
      detailRequests.push(detailMatch[1]);
      return {
        ok: true,
        json: async () => detailFixture,
      } as Response;
    }
    // The caller's own essay list (languageCheck store loadList refresh).
    if (url.pathname === "/api/grammar-check") {
      return { ok: true, json: async () => [] } as Response;
    }
    throw new Error(`unexpected fetch: ${url.pathname}`);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Stat card value shown next to its label (e.g. statEssays → "2"). */
function statValue(label: string): string {
  const card = screen.getByText(label).closest("div");
  if (!card) throw new Error(`stat card ${label} not found`);
  return card.querySelector("p")?.textContent ?? "";
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
      expect(statValue("languageCheck.staff.statChecked")).toBe("1");
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
    const button = row.querySelector("button");
    if (!button) throw new Error(`view button for ${title} not found`);
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

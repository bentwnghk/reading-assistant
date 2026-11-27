import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, within } from "@testing-library/react";
import { toast } from "sonner";
import StaffLearning from "./StaffLearning";

// Regression tests for the staff Sessions-table delete on /writing-assessment
// (view=students, tab=learning). The server applies the caller's scope inside
// the DELETE, so these only verify the wiring: confirm dialog → DELETE to the
// staff endpoint → toast + table refresh (stepping back from a dead last page).

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// LearnExportMenu (rendered in every row) reads the session role.
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: "teacher" } },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// The Overview tab renders charts before the test switches to "sessions".
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub, ComposedChart: Stub, LineChart: Stub, Bar: Stub, Line: Stub,
    XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub, Legend: Stub,
  };
});

interface FixtureRow {
  id: string;
  userName: string;
  essayTitle: string;
  status?: "in_progress" | "completed";
}

/** Rows the mocked list answers with (reset before each test). */
let rowsFixture: FixtureRow[];

/** GET …/staff/sessions?<query> captures (the refresh proof). */
const sessionRequests: string[] = [];
/** DELETE …/staff/sessions/:id captures. */
const deleteRequests: string[] = [];
/** When true, the staff DELETE answers 500. */
let deleteFails = false;

const dashboard = {
  range: 30,
  timeZone: "UTC",
  bucketUnit: "day",
  totals: {
    learners: 0, sessionsStarted: 0, sessionsCompleted: 0, lessonsViewed: 0,
    practiceAnswered: 0, practiceAccuracy: null, quizzesCompleted: 0, avgQuizPercent: null,
    improvement: null, topicsSecure: 0, topicsDeveloping: 0, topicsReview: 0,
    activeDays: 0, activeMinutes: 0, lastActiveAt: null,
  },
  series: [],
  categories: [],
  quizHistory: [],
  students: [],
  studentsTotal: 0,
  users: [],
};

const makeRow = (id: string, userName: string, essayTitle: string, status: FixtureRow["status"] = "completed") => ({
  id,
  essayId: null,
  essayTitle,
  age: 14,
  status,
  unitCount: 1,
  unitsCompleted: status === "completed" ? 1 : 0,
  avgQuizPercent: status === "completed" ? 80 : null,
  units: [],
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  userId: id,
  userName,
  userEmail: `${userName.toLowerCase()}@example.com`,
});

const DEFAULT_ROWS: FixtureRow[] = [
  { id: "ls1", userName: "Amy", essayTitle: "Amy essay" },
  { id: "ls2", userName: "Ben", essayTitle: "Ben essay" },
];

beforeEach(() => {
  rowsFixture = [...DEFAULT_ROWS];
  sessionRequests.length = 0;
  deleteRequests.length = 0;
  deleteFails = false;
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/writing-assessment/learn/staff/dashboard") {
      return { ok: true, json: async () => dashboard } as Response;
    }
    if (url.pathname === "/api/writing-assessment/learn/staff/sessions") {
      sessionRequests.push(url.searchParams.toString());
      const page = Number(url.searchParams.get("page") ?? 1);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
      return {
        ok: true,
        json: async () => ({
          rows: rowsFixture.slice((page - 1) * pageSize, page * pageSize).map((r) =>
            makeRow(r.id, r.userName, r.essayTitle, r.status),
          ),
          total: rowsFixture.length,
        }),
      } as Response;
    }
    const detail = url.pathname.match(/^\/api\/writing-assessment\/learn\/staff\/sessions\/([^/]+)$/);
    if (detail && init?.method === "DELETE") {
      deleteRequests.push(detail[1]);
      if (deleteFails) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "delete failed" }),
        } as Response;
      }
      // Like the server: a successful delete removes the row from later reads.
      rowsFixture = rowsFixture.filter((r) => r.id !== detail[1]);
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
});

afterEach(cleanup);

/** The sessions table behind the "sessions" tab, with its rows loaded. */
async function renderSessions(firstTitle = "Amy essay") {
  render(<StaffLearning classId={null} userId={null} onPickStudent={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "languageCheck.learnData.staffTabs.sessions" }));
  await waitFor(() => expect(screen.getByText(firstTitle)).toBeTruthy());
}

/** The trash button inside the row titled `title`. */
function deleteButtonForRow(title: string): HTMLButtonElement {
  const row = screen.getByText(title).closest("tr");
  if (!row) throw new Error(`row ${title} not found`);
  return within(row).getByRole("button", {
    name: "languageCheck.learnData.staffDelete",
  }) as HTMLButtonElement;
}

/** Opens the confirm dialog from `title`'s row and returns its buttons. */
async function askToDelete(title: string) {
  fireEvent.click(deleteButtonForRow(title));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("languageCheck.learnData.staffDeleteTitle")).toBeTruthy();
  expect(within(dialog).getByText("languageCheck.learnData.staffDeleteDesc")).toBeTruthy();
  return {
    dialog,
    confirm: within(dialog).getByRole("button", {
      name: "languageCheck.list.delete",
    }) as HTMLButtonElement,
    cancel: within(dialog).getByRole("button", {
      name: "languageCheck.cancel",
    }) as HTMLButtonElement,
  };
}

describe("StaffLearning sessions delete", () => {
  it("asks for confirmation, deletes via the staff endpoint, then refreshes", async () => {
    await renderSessions();
    const listReads = sessionRequests.length;
    const { confirm } = await askToDelete("Amy essay");
    // Opening the dialog alone never deletes.
    expect(deleteRequests).toEqual([]);

    fireEvent.click(confirm);
    await waitFor(() => expect(deleteRequests).toEqual(["ls1"]));
    expect(toast.success).toHaveBeenCalledWith("languageCheck.learnData.staffDeleted");
    // The table re-fetches (a plain reload: same first-page query again).
    await waitFor(() => expect(sessionRequests.length).toBe(listReads + 1));
    expect(screen.queryByText("Amy essay")).toBeNull();
    expect(screen.getByText("Ben essay")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText("languageCheck.learnData.staffDeleteTitle")).toBeNull(),
    );
  });

  it("Cancel closes the dialog without a request or a reload", async () => {
    await renderSessions();
    const listReads = sessionRequests.length;
    const { cancel } = await askToDelete("Ben essay");

    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(deleteRequests).toEqual([]);
    expect(sessionRequests.length).toBe(listReads);
    expect(screen.getByText("Ben essay")).toBeTruthy();
  });

  it("a failed delete keeps the row and the dialog, and reports the error", async () => {
    await renderSessions();
    deleteFails = true;
    const { confirm, dialog } = await askToDelete("Amy essay");

    fireEvent.click(confirm);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("[Error]: delete failed"));
    expect(deleteRequests).toEqual(["ls1"]);
    // The row stays and the dialog stays open for a retry.
    expect(within(dialog).getByText("languageCheck.learnData.staffDeleteTitle")).toBeTruthy();
    expect(screen.getByText("Amy essay")).toBeTruthy();
    await waitFor(() => expect(confirm.disabled).toBe(false));
  });

  it("deleting the last row of a later page steps back to the previous page", async () => {
    // Twenty-one rows at the default twenty per page: page 1 holds
    // "Essay 0"…"Essay 19", page 2 the single row "Essay 20".
    rowsFixture = Array.from({ length: 21 }, (_, i) => ({
      id: `ls${i}`,
      userName: i % 2 ? "Ben" : "Amy",
      essayTitle: `Essay ${i}`,
    }));
    await renderSessions("Essay 0");

    const pager = screen.getByText("languageCheck.staff.page").parentElement!;
    const nextButton = Array.from(pager.querySelectorAll("button")).pop()!;
    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(sessionRequests[sessionRequests.length - 1]).toContain("page=2"),
    );
    await waitFor(() => expect(screen.getByText("Essay 20")).toBeTruthy());

    const { confirm } = await askToDelete("Essay 20");
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteRequests).toEqual(["ls20"]));

    // Page 2 no longer exists (twenty rows left) — the reload asks for page 1
    // instead of an empty page 2.
    await waitFor(() => {
      const last = sessionRequests[sessionRequests.length - 1];
      expect(last).toContain("page=1");
      expect(last).not.toContain("page=2");
    });
    await waitFor(() => expect(screen.getByText("Essay 0")).toBeTruthy());
    expect(screen.queryByText("Essay 20")).toBeNull();
  });
});

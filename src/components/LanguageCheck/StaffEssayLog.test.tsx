import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import StaffEssayLog from "./StaffEssayLog";

// Regression tests for the Essay Activity Log filters. Each filter — class,
// student, status — must fire a narrowed request WITHOUT requiring a class
// to be picked first, narrow the table rows AND the stats cards, and the
// student dropdown options must survive student/status filters (they stay
// scoped to the staff scope + class so students remain switchable).

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
    // Like the real API: student options stay scope-wide (2 students)
    // regardless of the student/status filters.
    users: [
      { id: "alice", name: "Alice", email: "alice@example.com" },
      { id: "bob", name: "Bob", email: "bob@example.com" },
    ],
  };
}

beforeEach(() => {
  staffRequests.length = 0;
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
    if (url.pathname === "/api/language-check/staff") {
      staffRequests.push(url.searchParams.toString());
      return {
        ok: true,
        json: async () => staffResponse(url),
      } as Response;
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

async function openStudentPicker() {
  // class, student and the status Select all have role=combobox; the status
  // trigger carries an aria-label, so the unnamed ones are class + student.
  const combos = screen
    .getAllByRole("combobox")
    .filter((el) => !el.getAttribute("aria-label"));
  expect(combos.length).toBe(2);
  fireEvent.click(combos[1]);
}

describe("StaffEssayLog filters", () => {
  it("picking a student without a class narrows the table and the stats cards", async () => {
    render(<StaffEssayLog />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.getByText("Bob essay")).toBeTruthy();
    });
    expect(statValue("languageCheck.staff.statEssays")).toBe("2");
    const before = staffRequests.length;

    await openStudentPicker();
    const alice = await waitFor(() => {
      const matches = screen.getAllByText("Alice").filter(
        (el) => el.closest("[cmdk-item]") !== null,
      );
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    });
    fireEvent.click(alice);

    await waitFor(() => {
      expect(staffRequests.length).toBeGreaterThan(before);
      expect(staffRequests[staffRequests.length - 1]).toContain("userId=alice");
    });

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.queryByText("Bob essay")).toBeNull();
      // Stats cards reflect the narrowed set, not the scope-wide totals.
      expect(statValue("languageCheck.staff.statEssays")).toBe("1");
      expect(statValue("languageCheck.staff.statStudents")).toBe("1");
    });
  });

  it("picking a status without a class narrows the table and the stats cards", async () => {
    render(<StaffEssayLog />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
      expect(screen.getByText("Bob essay")).toBeTruthy();
    });
    expect(statValue("languageCheck.staff.statEssays")).toBe("2");
    const before = staffRequests.length;

    const trigger = screen.getByRole("combobox", {
      name: "languageCheck.staff.filterStatus",
    });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);

    const option = await waitFor(() => {
      const matches = screen.getAllByText("languageCheck.list.status.checked").filter(
        (el) => el.closest("[role=option]") !== null,
      );
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    });
    fireEvent.click(option);

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

  it("student dropdown options survive a status filter (stay scope-wide)", async () => {
    render(<StaffEssayLog />);

    await waitFor(() => {
      expect(screen.getByText("Alice essay")).toBeTruthy();
    });

    // Narrow by status first
    const trigger = screen.getByRole("combobox", {
      name: "languageCheck.staff.filterStatus",
    });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);
    const option = await waitFor(() => {
      const matches = screen.getAllByText("languageCheck.list.status.checked").filter(
        (el) => el.closest("[role=option]") !== null,
      );
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    });
    fireEvent.click(option);
    await waitFor(() => {
      expect(screen.queryByText("Bob essay")).toBeNull();
    });

    // The student picker must still list both students so the user can
    // switch (the server keeps `users` scoped, not filtered).
    await openStudentPicker();
    await waitFor(() => {
      const items = screen
        .getAllByText("Bob")
        .filter((el) => el.closest("[cmdk-item]") !== null);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});

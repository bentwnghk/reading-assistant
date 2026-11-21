import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import MoveEssayDialog from "./MoveEssayDialog";
import { useLanguageCheckStore } from "@/store/languageCheck";

// The move dialog is the remediation path for a mis-attributed essay. It
// must demand an explicit target: confirm stays disabled until a student is
// picked, a same-owner pick is a disabled no-op, and a real pick fires the
// store action (and closes the dialog).

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: "teacher" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string; title?: string }) =>
      opts?.name !== undefined
        ? `${key}:${opts.name}`
        : opts?.title !== undefined
          ? `${key}:${opts.title}`
          : key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const moveSpy = vi.fn();

const ESSAY: LanguageCheckEssaySummary = {
  id: "essay-1",
  title: "My own essay",
  status: "checked",
  pageCount: 1,
  errorCount: 2,
  overall: null,
  wordCount: 10,
  ownerId: "teacher-1",
  ownerName: "Teacher",
  createdAt: 0,
  updatedAt: 0,
};

const CLASSES: ClassInfo[] = [
  { id: "c1", name: "S2A", teacherId: "teacher-1", createdAt: 0 },
];

const STUDENTS: LanguageCheckStaffUser[] = [
  { id: "s1", name: "Amy Wong", email: "amy@example.com" },
  { id: "s2", name: "Ben Chan", email: "ben@example.com" },
];

const fetchMock = vi.fn(async (url: string) => {
  if (String(url).includes("/api/classes")) {
    return { ok: true, json: async () => CLASSES } as Response;
  }
  return { ok: true, json: async () => ({ users: STUDENTS }) } as Response;
});

// cmdk needs ResizeObserver + scrollIntoView, absent in jsdom
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
Element.prototype.scrollIntoView ??= () => {};

async function openDialog(essay = ESSAY) {
  const onOpenChange = vi.fn();
  render(<MoveEssayDialog essay={essay} open onOpenChange={onOpenChange} />);
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("staff/students"),
      expect.anything(),
    ),
  );
  return onOpenChange;
}

/** Pick a student from the (second) combobox and return the confirm button. */
async function pickStudent(name: string) {
  const combo = screen.getAllByRole("combobox");
  fireEvent.click(combo[combo.length - 1]);
  fireEvent.click(await screen.findByText(name));
  return screen.getByRole("button", { name: "languageCheck.list.moveConfirm" });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  moveSpy.mockClear();
  useLanguageCheckStore.setState({ moveEssay: moveSpy });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MoveEssayDialog", () => {
  it("blocks confirm until a student is explicitly picked", async () => {
    await openDialog();
    const confirm = screen.getByRole("button", {
      name: "languageCheck.list.moveConfirm",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  });

  it("moves the essay to the picked student and closes", async () => {
    const onOpenChange = await openDialog();
    const confirm = await pickStudent("Amy Wong");
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(moveSpy).toHaveBeenCalledWith("essay-1", "s1"),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("disables confirm when the picked student already owns the essay", async () => {
    await openDialog({
      ...ESSAY,
      id: "essay-2",
      title: "Amy's essay",
      ownerId: "s1",
      ownerName: "Amy Wong",
    });
    const confirm = await pickStudent("Amy Wong");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(moveSpy).not.toHaveBeenCalled();
  });
});

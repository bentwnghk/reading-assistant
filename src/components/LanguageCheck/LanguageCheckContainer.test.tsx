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

vi.mock("next/navigation", () => ({
  usePathname: () => "/writing-assessment",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  // Land on the essays tab so the upload card (and its pickers) render.
  useSearchParams: () => new URLSearchParams("tab=essays"),
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

const CLASSES: ClassInfo[] = [
  { id: "c-mine", name: "My Class", teacherId: "admin-1", createdAt: 0 },
  // In the same school (so it lists for the admin) but not taught by them,
  // and its student fetch comes back empty — the reported scenario.
  { id: "c-empty", name: "Empty Class", teacherId: "someone-else", createdAt: 0 },
];

const AMY: LanguageCheckStaffUser = {
  id: "s1",
  name: "Amy Wong",
  email: "amy@example.com",
};

const fetchMock = vi.fn(async (url: string) => {
  const u = String(url);
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

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import StudentViewFilters from "./StudentViewFilters";
import { useVocabularyStore } from "@/store/vocabulary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const STUDENTS = [
  {
    id: "s1",
    name: "Alice Classed",
    email: "alice@example.com",
    classId: "c1",
    className: "Gp1",
    teacherId: "t1",
    teacherName: "Teacher One",
    classes: [{ id: "c1", name: "Gp1", teacherId: "t1", teacherName: "Teacher One" }],
    schoolId: "sch",
    schoolName: "School",
  },
  {
    id: "s2",
    name: "Bob Classless",
    email: "bob@example.com",
    classId: null,
    className: null,
    teacherId: null,
    teacherName: null,
    classes: [],
    schoolId: "sch",
    schoolName: "School",
  },
];

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ students: STUDENTS }) })),
  );
});

afterEach(() => {
  cleanup();
  useVocabularyStore.setState({ viewingUserId: null, viewingUserName: null });
  vi.unstubAllGlobals();
});

describe("StudentViewFilters — No class", () => {
  it("narrows the student picker to classless students", async () => {
    render(<StudentViewFilters role="admin" />);

    // [0] = class picker, [last] = student picker (admin also has a teacher Select).
    await waitFor(() =>
      expect((screen.getAllByRole("combobox")[0] as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByText("vocabulary.studentView.noClass"));

    const all = screen.getAllByRole("combobox");
    fireEvent.click(all[all.length - 1]);

    await screen.findByText("Bob Classless");
    expect(screen.queryByText("Alice Classed")).toBeNull();
  });

  it("does not keep listing an already-open student who is outside the filter", async () => {
    useVocabularyStore.setState({ viewingUserId: "s1", viewingUserName: "Alice Classed" });
    render(<StudentViewFilters role="admin" />);

    await waitFor(() =>
      expect((screen.getAllByRole("combobox")[0] as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByText("vocabulary.studentView.noClass"));

    const all = screen.getAllByRole("combobox");
    fireEvent.click(all[all.length - 1]);

    await screen.findByText("Bob Classless");
    // The open student appears as the trigger label, but must not be a list option.
    const options = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(options.some((o) => o.includes("Alice Classed"))).toBe(false);
  });
});

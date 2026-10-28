import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EssayList from "./EssayList";
import { useLanguageCheckStore } from "@/store/languageCheck";

// jsdom has no matchMedia; PageSourceButtons probes pointer coarseness.
beforeAll(() => {
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
});

// Teacher upload UI: the staff picker slot renders inside the upload card,
// the drop prompt switches to the student's name, and essays uploaded for a
// student carry a "For <name>" attribution chip — while the owner's own rows
// (and the whole student experience) stay unchanged.

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "teacher-1", role: "teacher" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // Include the interpolation arg when present so chips can be asserted.
    t: (key: string, opts?: { name?: string }) =>
      opts?.name !== undefined ? `${key}:${opts.name}` : key,
  }),
}));

const ESSAYS: LanguageCheckEssaySummary[] = [
  {
    id: "own",
    title: "My own essay",
    status: "checked",
    pageCount: 1,
    errorCount: 2,
    ownerId: "teacher-1",
    ownerName: "Teacher",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "for-amy",
    title: "Amy's essay",
    status: "checked",
    pageCount: 2,
    errorCount: 1,
    ownerId: "s1",
    ownerName: "Amy",
    createdAt: 0,
    updatedAt: 0,
  },
];

beforeEach(() => {
  useLanguageCheckStore.setState({
    essays: ESSAYS,
    listLoading: false,
    listLoaded: true,
  });
});

afterEach(cleanup);

describe("EssayList teacher-upload affordances", () => {
  it("attributes rows uploaded for a student, not the viewer's own", () => {
    render(
      <EssayList preparing={false} onFiles={() => {}} onOpen={() => {}} />,
    );
    expect(screen.getByText("languageCheck.list.for:Amy")).toBeTruthy();
    expect(screen.queryByText("languageCheck.list.for:Teacher")).toBeNull();
  });

  it("renders the staff picker slot and swaps the drop prompt to the student", () => {
    render(
      <EssayList
        preparing={false}
        onFiles={() => {}} 
        onOpen={() => {}}
        studentPicker={<div data-testid="picker">picker</div>}
        forStudentName="Amy"
      />,
    );
    // Picker sits inside the upload card, above the drop prompt.
    expect(screen.getByTestId("picker")).toBeTruthy();
    expect(screen.getByText("languageCheck.upload.dropFor:Amy")).toBeTruthy();
    expect(screen.queryByText("languageCheck.upload.drop")).toBeNull();
  });

  it("keeps the plain drop prompt without a student selection", () => {
    render(
      <EssayList
        preparing={false}
        onFiles={() => {}}
        onOpen={() => {}}
        studentPicker={<div data-testid="picker">picker</div>}
      />,
    );
    expect(screen.getByText("languageCheck.upload.drop")).toBeTruthy();
    expect(screen.queryByText(/dropFor/)).toBeNull();
  });
});

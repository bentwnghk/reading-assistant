import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import EnhancedEssayPanel from "./EnhancedEssayPanel";
import { useReadingStore } from "@/store/reading";

// Students cannot regenerate enhanced essays: with allowRegenerate={false}
// the saved result renders read-only (no "Regenerate" button), while the
// FIRST generation and the staff view (default) keep their buttons.

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock the hook module so the test never pulls in the AI SDK provider chain.
vi.mock("@/hooks/useLanguageCheck", () => ({
  default: () => ({
    enhanceEssay: vi.fn(),
    assessLanguage: vi.fn(),
    runCheck: vi.fn(),
    runStaffCheck: vi.fn(),
    transcribe: vi.fn(),
    generate: vi.fn(),
  }),
}));

const SAVED: LanguageCheckEnhanced = {
  light: "Cleaned up.",
  heavy: "Rewritten.",
  generatedAt: 1700000000000,
  model: "gpt-6.1-sol",
};

const essay = (enhanced: LanguageCheckEnhanced | null) => ({
  id: "e1",
  checkedText: "My essay.",
  transcript: "My essay.",
  corrections: [],
  enhanced,
});

afterEach(cleanup);

describe("EnhancedEssayPanel regeneration lock", () => {
  it("hides the regenerate button for a student with saved enhanced essays", () => {
    render(
      <EnhancedEssayPanel
        essay={essay(SAVED)}
        allowRegenerate={false}
        onSave={vi.fn()}
      />,
    );
    // The saved result stays fully visible…
    expect(screen.getByText("languageCheck.enhanced.title")).toBeTruthy();
    expect(screen.getByText("languageCheck.enhanced.light")).toBeTruthy();
    expect(screen.getByText("Cleaned up.")).toBeTruthy();
    // …but read-only: no way to run the generation again.
    expect(screen.queryByText("languageCheck.enhanced.again")).toBeNull();
  });

  it("keeps the regenerate button when regeneration is allowed (staff default)", () => {
    render(<EnhancedEssayPanel essay={essay(SAVED)} onSave={vi.fn()} />);
    expect(screen.getByText("languageCheck.enhanced.again")).toBeTruthy();
  });

  it("still offers the FIRST generation to a student", () => {
    render(
      <EnhancedEssayPanel
        essay={essay(null)}
        allowRegenerate={false}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("languageCheck.enhanced.button")).toBeTruthy();
  });

  it("shows the heavy version when the switcher is clicked", () => {
    render(<EnhancedEssayPanel essay={essay(SAVED)} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("languageCheck.enhanced.heavy"));
    expect(screen.getByText("Rewritten.")).toBeTruthy();
    expect(screen.queryByText("Cleaned up.")).toBeNull();
    // …and back.
    fireEvent.click(screen.getByText("languageCheck.enhanced.light"));
    expect(screen.getByText("Cleaned up.")).toBeTruthy();
  });
});

describe("EnhancedEssayPanel load into Reading Assistant", () => {
  afterEach(() => {
    pushMock.mockClear();
    useReadingStore.setState({
      source: "upload",
      docTitle: "",
      extractedText: "",
      activeGenerations: {},
    });
  });

  it("offers the load action only once a result exists", () => {
    render(
      <EnhancedEssayPanel essay={essay(null)} allowRegenerate={false} onSave={vi.fn()} />,
    );
    expect(screen.queryByText("languageCheck.enhanced.loadToReading")).toBeNull();
  });

  it("loads the selected version as a From Writing reading session", () => {
    render(<EnhancedEssayPanel essay={essay(SAVED)} onSave={vi.fn()} />);
    // Light is selected by default.
    fireEvent.click(screen.getByText("languageCheck.enhanced.loadToReading"));
    const state = useReadingStore.getState();
    expect(state.source).toBe("writing");
    expect(state.docTitle).toBe("languageCheck.list.untitled"); // no title → fallback
    expect(state.extractedText).toContain("Cleaned up.");
    expect(pushMock).toHaveBeenCalledWith("/?goto=section-upload");

    // The heavy version loads after switching.
    fireEvent.click(screen.getByText("languageCheck.enhanced.heavy"));
    fireEvent.click(screen.getByText("languageCheck.enhanced.loadToReading"));
    expect(useReadingStore.getState().extractedText).toContain("Rewritten.");
    expect(useReadingStore.getState().extractedText).not.toContain("Cleaned up.");
  });

  it("asks before cancelling an in-flight reading generation", () => {
    useReadingStore.setState({ activeGenerations: { summary: true } });
    render(<EnhancedEssayPanel essay={essay(SAVED)} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("languageCheck.enhanced.loadToReading"));
    // Blocked at the confirm dialog — nothing loaded yet.
    expect(useReadingStore.getState().source).toBe("upload");
    expect(pushMock).not.toHaveBeenCalled();
    // Confirming proceeds with the load.
    fireEvent.click(screen.getByText("history.confirmSwitch"));
    expect(useReadingStore.getState().source).toBe("writing");
    expect(pushMock).toHaveBeenCalledWith("/?goto=section-upload");
  });
});

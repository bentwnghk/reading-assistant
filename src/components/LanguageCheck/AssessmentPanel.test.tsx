import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AssessmentPanel from "./AssessmentPanel";

// Students cannot re-assess an assessed essay: with allowReassess={false}
// the saved result renders read-only (no "Re-assess" button), while the
// FIRST assessment and the staff view (default) keep their buttons.

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock the hook module so the test never pulls in the AI SDK provider chain.
vi.mock("@/hooks/useLanguageCheck", () => ({
  default: () => ({
    assessLanguage: vi.fn(),
    runCheck: vi.fn(),
    runStaffCheck: vi.fn(),
    transcribe: vi.fn(),
    generate: vi.fn(),
  }),
}));

const SAVED: LanguageCheckAssessment = {
  overall: 5,
  scores: {
    grammar: 5,
    sentenceStructure: 4,
    vocabulary: 5,
    spellingPunctuation: 6,
    registerToneStyle: 4,
  },
  strengths: [{ en: "Clear topic sentence", zh: "主題句清晰" }],
  weaknesses: [{ en: "Tense errors", zh: "時態錯誤" }],
  assessedAt: 1700000000000,
  model: "gpt-6.1-sol",
};

const essay = (assessment: LanguageCheckAssessment | null) => ({
  id: "e1",
  checkedText: "My essay.",
  transcript: "My essay.",
  corrections: [],
  assessment,
});

afterEach(cleanup);

describe("AssessmentPanel re-assessment lock", () => {
  it("hides the re-assess button for a student with a saved assessment", () => {
    render(
      <AssessmentPanel
        essay={essay(SAVED)}
        language="en"
        allowReassess={false}
        onSave={vi.fn()}
      />,
    );
    // The saved result stays fully visible…
    expect(screen.getByText("languageCheck.assessment.title")).toBeTruthy();
    expect(screen.getByText("languageCheck.assessment.overall")).toBeTruthy();
    expect(screen.getByText("languageCheck.assessment.strengths")).toBeTruthy();
    // …but read-only: no way to run the assessment again.
    expect(screen.queryByText("languageCheck.assessment.again")).toBeNull();
  });

  it("keeps the re-assess button when re-assessment is allowed (staff default)", () => {
    render(<AssessmentPanel essay={essay(SAVED)} language="en" onSave={vi.fn()} />);
    expect(screen.getByText("languageCheck.assessment.again")).toBeTruthy();
  });

  it("still offers the FIRST assessment to a student", () => {
    render(
      <AssessmentPanel
        essay={essay(null)}
        language="en"
        allowReassess={false}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("languageCheck.assessment.button")).toBeTruthy();
  });
});

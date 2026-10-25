import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExerciseCard from "./ExerciseCard";
import { parseExercises, type LearnExercise } from "@/utils/languageCheckLearn";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}${JSON.stringify(opts)}` : key,
  }),
}));

afterEach(cleanup);

function make(raw: unknown, allowed: Parameters<typeof parseExercises>[1]["allowed"]): LearnExercise {
  const { items } = parseExercises([raw], { idPrefix: "t", allowed, max: 1 });
  if (!items[0]) throw new Error("fixture rejected");
  return items[0];
}

function renderCard(item: LearnExercise, props: Partial<React.ComponentProps<typeof ExerciseCard>> = {}) {
  const onAttempt = vi.fn();
  const onNext = vi.fn();
  const onSubmit = vi.fn();
  const onReveal = vi.fn();
  render(
    <ExerciseCard
      item={item}
      index={0}
      total={3}
      mode="practice"
      language="en"
      strict={false}
      isLast={false}
      onAttempt={onAttempt}
      onNext={onNext}
      onSubmit={onSubmit}
      onReveal={onReveal}
      {...props}
    />,
  );
  return { onAttempt, onNext, onSubmit, onReveal };
}

const check = () => screen.getByRole("button", { name: "languageCheck.learn.exercise.check" });

describe("ExerciseCard (practice)", () => {
  it("choice: wrong first, then retry and correct; reports every attempt", async () => {
    const item = make(
      { type: "choice", question: "She ___ home.", options: ["go", "goes"], answer: "goes", explanation: "Add -s." },
      ["choice"],
    );
    const { onAttempt, onNext } = renderCard(item);
    expect((check() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: /go$/ }));
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 0, correct: false })));
    expect(screen.getByText("languageCheck.learn.exercise.notQuite")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /tryAgain/ }));
    fireEvent.click(screen.getByRole("radio", { name: /goes/ }));
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenLastCalledWith(expect.objectContaining({ score: 1, correct: true })));
    expect(screen.getByText("languageCheck.learn.exercise.correct")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /next/ }));
    expect(onNext).toHaveBeenCalled();
  });

  it("fill-blank: grades each gap independently", async () => {
    const item = make(
      { type: "fill-blank", sentence: "___ and ___ play.", answers: [["Tom"], ["Ann"]] },
      ["fill-blank"],
    );
    const { onAttempt } = renderCard(item);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "tom" } });
    fireEvent.change(inputs[1], { target: { value: "bob" } });
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 0.5, correct: false })));
  });

  it("reorder: builds the sentence from tapped words", async () => {
    const item = make({ type: "reorder", answer: "I like cats." }, ["reorder"]);
    const { onAttempt } = renderCard(item);
    for (const word of ["I", "like", "cats."]) {
      fireEvent.click(screen.getByRole("button", { name: word }));
    }
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 1, correct: true })));
  });

  it("proofread: marks a word, types the fix and is graded", async () => {
    const item = make(
      {
        type: "error-correction",
        passage: "She go to school.",
        errors: [{ wrong: "go", right: ["goes"] }],
      },
      ["error-correction"],
    );
    const { onAttempt } = renderCard(item);
    expect((check() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    const fix = screen.getByLabelText(/fixFor/);
    fireEvent.change(fix, { target: { value: "goes" } });
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 1, correct: true })));
  });

  it("rewrite: asks the AI evaluator when the answer is not a known rewrite", async () => {
    const item = make(
      { type: "rewrite", instruction: "Fix it.", source: "He go.", answers: ["He goes."] },
      ["rewrite"],
    );
    const evaluateOpen = vi.fn().mockResolvedValue({ verdict: "partial", feedback: "Nearly", feedbackZh: "" });
    const { onAttempt } = renderCard(item, { evaluateOpen });

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "He is going." } });
    fireEvent.click(check());
    await waitFor(() => expect(evaluateOpen).toHaveBeenCalledWith(item, "He is going."));
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 0.5, correct: false })));
    expect(screen.getByText("Nearly")).toBeTruthy();
  });

  it("rewrite: a known rewrite never calls the AI", async () => {
    const item = make(
      { type: "rewrite", instruction: "Fix it.", source: "He go.", answers: ["He goes."] },
      ["rewrite"],
    );
    const evaluateOpen = vi.fn();
    const { onAttempt } = renderCard(item, { evaluateOpen });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "he goes" } });
    fireEvent.click(check());
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ score: 1, correct: true })));
    expect(evaluateOpen).not.toHaveBeenCalled();
  });

  it("show answer completes the item", async () => {
    const item = make(
      { type: "choice", question: "q", options: ["a", "b"], answer: "a" },
      ["choice"],
    );
    const { onReveal } = renderCard(item);
    fireEvent.click(screen.getByRole("radio", { name: /b$/ }));
    fireEvent.click(check());
    await screen.findByText("languageCheck.learn.exercise.notQuite");
    fireEvent.click(screen.getByRole("button", { name: /showAnswer/ }));
    expect(onReveal).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /next/ })).toBeTruthy();
  });
});

describe("ExerciseCard (quiz)", () => {
  it("submits once with no hint and no feedback", async () => {
    const item = make(
      { type: "choice", question: "q", options: ["a", "b"], answer: "a", hint: "secret" },
      ["choice"],
    );
    const { onSubmit } = renderCard(item, { mode: "quiz" });
    expect(screen.queryByText(/exercise.hint/)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /a$/ }));
    fireEvent.click(screen.getByRole("button", { name: /submit/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("a", { score: 1, correct: true }),
    );
    expect(screen.queryByText("languageCheck.learn.exercise.correct")).toBeNull();
  });
});

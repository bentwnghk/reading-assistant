"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import {
  BlankText,
  ChoiceInput,
  FillBlankInput,
  FindFixInput,
  ReorderInput,
  TextInput,
} from "@/components/LanguageCheck/Learn/ExerciseInputs";
import {
  exerciseInstructionKey,
  exerciseTypeKey,
  pickLang,
  type LearnExercise,
} from "@/utils/languageCheckLearn";
import {
  answerReady,
  emptyAnswer,
  exerciseSolution,
  gradeAnswer,
  type FindFixAnswer,
  type Grade,
  type LearnAnswer,
} from "@/utils/languageCheckLearnGrade";
import type { OpenEvaluation } from "@/hooks/useLanguageCheckLearn";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface AttemptOutcome {
  score: number;
  correct: boolean;
  answer?: LearnAnswer;
}

interface ExerciseCardProps {
  item: LearnExercise;
  index: number;
  total: number;
  mode: "practice" | "quiz";
  language: ExplanationLanguage;
  strict: boolean;
  /**
   * Practice only: the item was already completed when the card mounted (the
   * learner navigated back to it) — show the solution. Read once, so finishing
   * the item does not swap the card for the solved view.
   */
  solved?: boolean;
  isLast: boolean;
  /** Practice: called after EVERY check; the parent keeps the first score. */
  onAttempt?: (outcome: AttemptOutcome) => void;
  /** Practice: the learner gave up and looked at the answer. */
  onReveal?: () => void;
  /** Quiz: the answer is final. */
  onSubmit?: (answer: LearnAnswer, outcome: AttemptOutcome) => void;
  onNext: () => void;
  evaluateOpen?: (
    item: Extract<LearnExercise, { type: "rewrite" | "compose" }>,
    answer: string,
  ) => Promise<OpenEvaluation | null>;
}

/**
 * One exercise. Practice mode = supported learning (hint, retry, instant
 * feedback, reveal). Quiz mode = independent check (no hint, one submission,
 * no feedback until the review at the end).
 */
export default function ExerciseCard({
  item,
  index,
  total,
  mode,
  language,
  strict,
  solved: solvedOnMount = false,
  isLast,
  onAttempt,
  onReveal,
  onSubmit,
  onNext,
  evaluateOpen,
}: ExerciseCardProps) {
  const { t } = useTranslation();
  const [solved] = useState(solvedOnMount);
  const [answer, setAnswer] = useState<LearnAnswer>(() => emptyAnswer(item));
  const [grade, setGrade] = useState<Grade | null>(null);
  const [open, setOpen] = useState<OpenEvaluation | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [revealed, setRevealed] = useState(solved);
  const [checking, setChecking] = useState(false);

  const quiz = mode === "quiz";
  const checked = grade !== null;
  const correct = grade?.correct ?? false;
  const locked = solved || checked || revealed || checking;
  const showHint = !quiz && !!item.hint && (hintShown || (checked && !correct));
  const explanation = pickLang(item.explanation, item.explanationZh, language);

  async function handleCheck() {
    if (!answerReady(item, answer) || checking) return;

    if (quiz) {
      const local = gradeAnswer(item, answer, strict);
      if (!local) return;
      onSubmit?.(answer, { score: local.score, correct: local.correct });
      return;
    }

    let result = gradeAnswer(item, answer, strict);
    let evaluation: OpenEvaluation | null = null;
    if (!result && evaluateOpen && (item.type === "rewrite" || item.type === "compose")) {
      setChecking(true);
      evaluation = await evaluateOpen(item, answer as string);
      setChecking(false);
      if (!evaluation) return;
      const score = evaluation.verdict === "correct" ? 1 : evaluation.verdict === "partial" ? 0.5 : 0;
      result = { score, correct: evaluation.verdict === "correct" };
    }
    if (!result) return;

    setOpen(evaluation);
    setGrade(result);
    setAttempts((n) => n + 1);
    onAttempt?.({ score: result.score, correct: result.correct, answer });
  }

  function handleRetry() {
    setGrade(null);
    setOpen(null);
    setHintShown(true);
    // A wrong choice or ordering is cleared; typed/marked work is kept to refine.
    if (item.type === "choice") setAnswer("");
    if (item.type === "reorder") setAnswer([]);
  }

  function handleReveal() {
    setRevealed(true);
    onReveal?.();
  }

  const done = solved || revealed || correct;

  return (
    <article className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold tabular-nums">
          {t("languageCheck.learn.exercise.counter", { current: index + 1, total })}
        </span>
        <span className="rounded-full border px-2.5 py-1 text-muted-foreground">
          {t(`languageCheck.learn.exercise.types.${exerciseTypeKey(item.type)}`)}
        </span>
      </header>

      <Prompt item={item} />

      {solved ? (
        <SolvedView item={item} explanation={explanation} />
      ) : (
        <>
          <Answer
            item={item}
            answer={answer}
            onChange={setAnswer}
            grade={grade}
            disabled={locked}
            onSubmit={handleCheck}
          />

          {showHint && !done && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item.hint}</span>
            </p>
          )}

          {checked && !quiz && (
            <Feedback
              item={item}
              correct={correct}
              revealed={revealed}
              partial={open?.verdict === "partial"}
              explanation={explanation}
              open={open}
              language={language}
            />
          )}
          {revealed && !checked && !quiz && <SolutionBox item={item} explanation={explanation} />}
        </>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        {!quiz && !solved && !checked && !revealed && item.hint && !hintShown && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setHintShown(true)}>
            <Lightbulb className="mr-1.5 h-4 w-4" />
            {t("languageCheck.learn.exercise.hint")}
          </Button>
        )}

        {!solved && !checked && !revealed && (
          <Button
            type="button"
            onClick={handleCheck}
            disabled={!answerReady(item, answer) || checking}
            className="ml-auto"
          >
            {checking && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
            {checking
              ? t("languageCheck.learn.exercise.checking")
              : quiz
                ? isLast
                  ? t("languageCheck.learn.exercise.submitLast")
                  : t("languageCheck.learn.exercise.submit")
                : t("languageCheck.learn.exercise.check")}
          </Button>
        )}

        {!quiz && !solved && checked && !correct && !revealed && (
          <>
            <Button type="button" variant="outline" onClick={handleRetry}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t("languageCheck.learn.exercise.tryAgain")}
            </Button>
            {attempts >= 1 && (
              <Button type="button" variant="ghost" onClick={handleReveal}>
                <Eye className="mr-1.5 h-4 w-4" />
                {t("languageCheck.learn.exercise.showAnswer")}
              </Button>
            )}
          </>
        )}

        {!quiz && done && (
          <Button type="button" onClick={onNext} className="ml-auto">
            {isLast
              ? t("languageCheck.learn.exercise.finish")
              : t("languageCheck.learn.exercise.next")}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </footer>
    </article>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Prompt({ item }: { item: LearnExercise }) {
  const { t } = useTranslation();
  const key = exerciseInstructionKey(item);
  return (
    <div className="space-y-2">
      {key && (
        <p className="text-sm font-medium text-muted-foreground">
          {t(`languageCheck.learn.exercise.instructions.${key}`)}
        </p>
      )}
      {item.type === "choice" && (
        <p className="text-lg font-medium leading-relaxed" lang="en">
          <BlankText text={item.question} />
        </p>
      )}
      {item.type === "reorder" && item.context && (
        <p className="text-base italic text-muted-foreground" lang="en">
          {item.context}
        </p>
      )}
      {(item.type === "rewrite" || item.type === "compose") && (
        <>
          <p className="text-base font-medium" lang="en">
            {item.instruction}
          </p>
          {item.type === "rewrite" && item.source && (
            <p
              className="rounded-lg border-l-4 border-primary/50 bg-muted/50 px-4 py-3 text-lg leading-relaxed"
              lang="en"
            >
              {item.source}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Answer({
  item,
  answer,
  onChange,
  grade,
  disabled,
  onSubmit,
}: {
  item: LearnExercise;
  answer: LearnAnswer;
  onChange: (a: LearnAnswer) => void;
  grade: Grade | null;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  switch (item.type) {
    case "choice":
      return (
        <ChoiceInput
          item={item}
          value={answer as string}
          onChange={onChange}
          grade={grade}
          disabled={disabled}
        />
      );
    case "fill-blank":
      return (
        <FillBlankInput
          item={item}
          values={answer as string[]}
          onChange={onChange}
          grade={grade}
          disabled={disabled}
          onSubmit={onSubmit}
        />
      );
    case "reorder":
      return (
        <ReorderInput
          item={item}
          placed={answer as string[]}
          onChange={onChange}
          grade={grade}
          disabled={disabled}
        />
      );
    case "error-correction":
    case "proofread":
      return (
        <FindFixInput
          item={item}
          value={answer as FindFixAnswer}
          onChange={onChange}
          grade={grade}
          disabled={disabled}
        />
      );
    case "rewrite":
    case "compose":
      return (
        <TextInput
          value={answer as string}
          onChange={onChange}
          disabled={disabled}
          rows={item.type === "compose" ? 4 : 3}
          placeholder={t("languageCheck.learn.exercise.typeHere")}
        />
      );
  }
}

function Feedback({
  item,
  correct,
  revealed,
  partial,
  explanation,
  open,
  language,
}: {
  item: LearnExercise;
  correct: boolean;
  revealed: boolean;
  partial: boolean;
  explanation: string;
  open: OpenEvaluation | null;
  language: ExplanationLanguage;
}) {
  const { t } = useTranslation();
  const tone = correct
    ? "border-green-500/60 bg-green-50 dark:bg-green-950/30"
    : partial
      ? "border-amber-500/60 bg-amber-50 dark:bg-amber-950/30"
      : "border-red-500/60 bg-red-50 dark:bg-red-950/30";
  const Icon = correct ? CircleCheck : CircleAlert;
  const iconTone = correct ? "text-green-600" : partial ? "text-amber-600" : "text-red-600";
  const openText = open ? pickLang(open.feedback, open.feedbackZh, language) : "";

  return (
    <div role="status" aria-live="polite" className={cn("space-y-2 rounded-xl border p-4", tone)}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon className={cn("h-5 w-5", iconTone)} />
        {correct
          ? t("languageCheck.learn.exercise.correct")
          : partial
            ? t("languageCheck.learn.exercise.almost")
            : t("languageCheck.learn.exercise.notQuite")}
      </p>
      {openText && <p className="text-sm">{openText}</p>}
      {(correct || revealed) && <SolutionBox item={item} explanation={explanation} bare />}
    </div>
  );
}

/** Model solution + the rule behind it (plus per-error notes for proofreading). */
function SolutionBox({
  item,
  explanation,
  bare = false,
}: {
  item: LearnExercise;
  explanation: string;
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const solution = exerciseSolution(item);
  return (
    <div className={cn("space-y-2 text-sm", !bare && "rounded-xl border bg-muted/40 p-4")}>
      {item.type !== "choice" && (
        <p>
          <span className="font-semibold">{t("languageCheck.learn.exercise.modelAnswer")}: </span>
          <span lang="en" className="font-medium">
            {solution}
          </span>
        </p>
      )}
      {item.type === "choice" && (
        <p>
          <span className="font-semibold">{t("languageCheck.learn.exercise.correctAnswer")}: </span>
          <span lang="en" className="font-medium">
            {solution}
          </span>
        </p>
      )}
      {explanation && <p className="text-muted-foreground">{explanation}</p>}
      {(item.type === "error-correction" || item.type === "proofread") && (
        <ul className="space-y-1">
          {item.errors.map((e, i) => (
            <li key={i} className="text-muted-foreground">
              <span className="font-medium text-red-700 line-through dark:text-red-300">
                {e.wrong}
              </span>{" "}
              →{" "}
              <span className="font-medium text-green-700 dark:text-green-300">
                {e.right[0] || t("languageCheck.results.delete")}
              </span>
              {(e.explanation || e.explanationZh) && (
                <span> — {e.explanation || e.explanationZh}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SolvedView({ item, explanation }: { item: LearnExercise; explanation: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
        <CircleCheck className="h-4 w-4" />
        {t("languageCheck.learn.exercise.alreadyDone")}
      </p>
      <SolutionBox item={item} explanation={explanation} />
    </div>
  );
}

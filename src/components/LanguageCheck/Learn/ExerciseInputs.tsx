"use client";
import { Fragment, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/style";
import {
  splitAtBlanks,
  type ChoiceExercise,
  type FillBlankExercise,
  type FindFixExercise,
  type ReorderExercise,
} from "@/utils/languageCheckLearn";
import {
  runsFromMarks,
  tokenizePassage,
  type FillBlankDetail,
  type FindFixAnswer,
  type FindFixDetail,
  type Grade,
} from "@/utils/languageCheckLearnGrade";

/** Browsers must not autocomplete/spell-check recall inputs (AGENTS §K). */
const NO_ASSIST = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  writingsuggestions: "false",
} as Record<string, unknown>;

/** Renders "___" gaps in a prompt as a visible blank. */
export function BlankText({ text }: { text: string }) {
  const parts = splitAtBlanks(text);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <span
              aria-label="blank"
              className="mx-1 inline-block w-14 translate-y-0.5 border-b-2 border-foreground/60"
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

// ─── Multiple choice ─────────────────────────────────────────────────────────

export function ChoiceInput({
  item,
  value,
  onChange,
  grade,
  disabled,
}: {
  item: ChoiceExercise;
  value: string;
  onChange: (v: string) => void;
  grade: Grade | null;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" className="grid gap-2">
      {item.options.map((option, i) => {
        const picked = value === option;
        const isAnswer = option === item.answer;
        const reveal = grade !== null;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={picked}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-base transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
              !reveal && !picked && "hover:bg-accent",
              !reveal && picked && "border-primary bg-primary/10",
              reveal && isAnswer && "border-green-500 bg-green-50 dark:bg-green-950/40",
              reveal && picked && !isAnswer && "border-red-500 bg-red-50 dark:bg-red-950/40",
              reveal && !picked && !isAnswer && "opacity-60",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                picked && !reveal && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1 break-words">{option}</span>
            {reveal && isAnswer && <Check className="h-4 w-4 shrink-0 text-green-600" />}
            {reveal && picked && !isAnswer && <X className="h-4 w-4 shrink-0 text-red-600" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Fill in the blank ───────────────────────────────────────────────────────

export function FillBlankInput({
  item,
  values,
  onChange,
  grade,
  disabled,
  onSubmit,
}: {
  item: FillBlankExercise;
  values: string[];
  onChange: (v: string[]) => void;
  grade: Grade | null;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const parts = splitAtBlanks(item.sentence);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const detail = grade?.detail as FillBlankDetail | undefined;

  return (
    <p className="text-lg leading-[3rem]" lang="en">
      {parts.map((part, i) => (
        <Fragment key={i}>
          <span className="whitespace-pre-wrap">{part}</span>
          {i < parts.length - 1 && (
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={values[i] ?? ""}
              disabled={disabled}
              aria-label={t("languageCheck.learn.exercise.blankN", { n: i + 1 })}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (i < parts.length - 2) refs.current[i + 1]?.focus();
                else onSubmit();
              }}
              style={{ width: `${Math.max(6, (values[i]?.length ?? 0) + 2)}ch` }}
              className={cn(
                "mx-1 rounded-md border-0 border-b-2 bg-muted/50 px-1.5 py-0.5 text-center text-lg",
                "focus-visible:border-primary focus-visible:outline-none",
                !detail && "border-foreground/50",
                detail?.blanks[i] === true && "border-green-500 bg-green-100 dark:bg-green-950/50",
                detail?.blanks[i] === false && "border-red-500 bg-red-100 dark:bg-red-950/50",
              )}
              {...NO_ASSIST}
            />
          )}
        </Fragment>
      ))}
    </p>
  );
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

export function ReorderInput({
  item,
  placed,
  onChange,
  grade,
  disabled,
}: {
  item: ReorderExercise;
  placed: string[];
  onChange: (v: string[]) => void;
  grade: Grade | null;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  // Identical words are interchangeable, so the bank is the multiset difference.
  const remaining = [...item.tokens];
  for (const word of placed) {
    const at = remaining.indexOf(word);
    if (at !== -1) remaining.splice(at, 1);
  }
  const state = grade ? (grade.correct ? "right" : "wrong") : "idle";

  return (
    <div className="space-y-3">
      <div
        aria-live="polite"
        className={cn(
          "flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-2.5",
          state === "right" && "border-green-500 bg-green-50 dark:bg-green-950/30",
          state === "wrong" && "border-red-500 bg-red-50 dark:bg-red-950/30",
        )}
      >
        {placed.length === 0 && (
          <span className="px-1 text-sm text-muted-foreground">
            {t("languageCheck.learn.exercise.reorderEmpty")}
          </span>
        )}
        {placed.map((word, i) => (
          <button
            key={`${word}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange(placed.filter((_, j) => j !== i))}
            title={t("languageCheck.learn.exercise.removeWord")}
            className="rounded-lg border bg-card px-3 py-1.5 text-base shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
          >
            {word}
          </button>
        ))}
      </div>
      <div className="flex min-h-[3rem] flex-wrap gap-2">
        {remaining.map((word, i) => (
          <button
            key={`${word}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...placed, word])}
            className="rounded-lg border bg-muted px-3 py-1.5 text-base hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Find and fix (error correction / proofreading) ──────────────────────────

export function FindFixInput({
  item,
  value,
  onChange,
  grade,
  disabled,
}: {
  item: FindFixExercise;
  value: FindFixAnswer;
  onChange: (v: FindFixAnswer) => void;
  grade: Grade | null;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const tokens = tokenizePassage(item.passage);
  const runs = runsFromMarks(item.passage, tokens, value.marked);
  const detail = grade?.detail as FindFixDetail | undefined;
  const marked = new Set(value.marked);
  const falseTokens = new Set(
    (detail?.falseRuns ?? []).flatMap((first) => {
      const run = runs.find((r) => r.first === first);
      return run ? Array.from({ length: run.last - run.first + 1 }, (_, i) => run.first + i) : [];
    }),
  );

  function toggle(index: number) {
    const next = marked.has(index)
      ? value.marked.filter((i) => i !== index)
      : [...value.marked, index];
    onChange({ marked: next, fixes: value.fixes });
  }

  function statusOf(token: { start: number; end: number; index: number }) {
    if (!detail) return null;
    const errorIndex = item.errors.findIndex((e) => token.start < e.end && token.end > e.start);
    if (errorIndex !== -1) {
      return detail.errors[errorIndex]?.fixed
        ? "fixed"
        : detail.errors[errorIndex]?.detected
          ? "found"
          : "missed";
    }
    return falseTokens.has(token.index) ? "false" : null;
  }

  return (
    <div className="space-y-4">
      <p className="text-lg leading-[2.6rem]" lang="en">
        {tokens.map((token, i) => {
          const gap = i === 0 ? "" : item.passage.slice(tokens[i - 1].end, token.start);
          const status = statusOf(token);
          const isMarked = marked.has(token.index);
          return (
            <Fragment key={token.index}>
              {gap && <span className="whitespace-pre-wrap">{gap.replace(/\s+/g, " ")}</span>}
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isMarked}
                onClick={() => toggle(token.index)}
                className={cn(
                  "rounded px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                  !disabled && "hover:bg-accent",
                  isMarked && !status && "bg-amber-200 underline decoration-amber-600 decoration-2 underline-offset-4 dark:bg-amber-900/70",
                  status === "fixed" && "bg-green-200 dark:bg-green-900/60",
                  status === "found" && "bg-orange-200 dark:bg-orange-900/60",
                  status === "missed" && "bg-red-200 underline decoration-red-600 decoration-wavy dark:bg-red-900/60",
                  status === "false" && "bg-slate-200 line-through dark:bg-slate-700",
                )}
              >
                {token.text}
              </button>
            </Fragment>
          );
        })}
      </p>

      {runs.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("languageCheck.learn.exercise.yourFixes")}
          </p>
          {runs.map((run) => (
            <label key={run.first} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 line-through dark:bg-red-950 dark:text-red-300">
                {run.text}
              </span>
              <span aria-hidden>→</span>
              <input
                value={value.fixes[run.first] ?? run.text}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ marked: value.marked, fixes: { ...value.fixes, [run.first]: e.target.value } })
                }
                placeholder={t("languageCheck.learn.exercise.fixPlaceholder")}
                aria-label={t("languageCheck.learn.exercise.fixFor", { text: run.text })}
                className="min-w-[8rem] flex-1 rounded-md border bg-background px-2 py-1 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...NO_ASSIST}
              />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            {t("languageCheck.learn.exercise.fixHint")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Free text (rewrite / compose) ───────────────────────────────────────────

export function TextInput({
  value,
  onChange,
  disabled,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Textarea
      value={value}
      disabled={disabled}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="text-base"
      lang="en"
      {...NO_ASSIST}
    />
  );
}

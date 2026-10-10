"use client";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";
import { contextAround } from "@/utils/languageCheck";
import {
  DiffChips,
  categoryStyle,
  explanationFor,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface CorrectionCardProps {
  error: LanguageCheckError;
  number: number;
  text: string;
  language: ExplanationLanguage;
  active: boolean;
  onSelect: (id: string) => void;
}

/** Side-panel card: ORIGINAL → chips → CORRECTIONS → EXPLANATION. */
export default function CorrectionCard({
  error,
  number,
  text,
  language,
  active,
  onSelect,
}: CorrectionCardProps) {
  const { t } = useTranslation();
  const label = useCategoryLabel()(error.category);
  const style = categoryStyle(error.category);
  const ctx = contextAround(text, error.start, error.end);
  const explanation = explanationFor(error, language);

  return (
    <div
      id={`lc-card-${error.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(error.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(error.id);
        }
      }}
      className={cn(
        "cursor-pointer rounded-xl border border-l-4 bg-card p-4 text-card-foreground shadow-sm transition-all hover:shadow-md",
        style.border,
        active && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            style.badge,
          )}
        >
          {number}
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("languageCheck.results.original")}
      </p>
      <p className="mt-1 text-sm leading-relaxed">
        {ctx.before}
        <span className="rounded bg-red-100 px-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
          {ctx.match}
        </span>
        {ctx.after}
      </p>

      <div className="mt-3">
        <DiffChips original={error.original} correction={error.correction} />
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
        {t("languageCheck.results.corrections")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-green-700 dark:text-green-400">
        {ctx.before}
        <span className="font-semibold">
          {error.correction || t("languageCheck.results.deleteShort")}
        </span>
        {ctx.after}
      </p>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("languageCheck.results.explanation")}
      </p>
      <p className="mt-1 text-sm leading-relaxed">
        {explanation || t("languageCheck.results.noExplanation")}
      </p>
    </div>
  );
}

"use client";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import {
  DEFAULT_CATEGORY_STYLE,
  LANGUAGE_CHECK_CATEGORY_STYLES,
  type CategoryStyle,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import { diffChanges } from "@/utils/languageCheck";
import type { ExplanationLanguage } from "@/store/languageCheck";

export function categoryStyle(category: string): CategoryStyle {
  return (
    LANGUAGE_CHECK_CATEGORY_STYLES[category as LanguageCheckCategory] ??
    DEFAULT_CATEGORY_STYLE
  );
}

/** Localised category label (e.g. "Subject-verb agreement"). */
export function useCategoryLabel(): (category: string) => string {
  const { t } = useTranslation();
  return (category) =>
    t(`languageCheck.categories.${category}`, { defaultValue: category });
}

/** Explanation in the active language, falling back to the other one. */
export function explanationFor(
  error: LanguageCheckError,
  lang: ExplanationLanguage,
): string {
  const primary = lang === "zh" ? error.explanationZh : error.explanation;
  const secondary = lang === "zh" ? error.explanation : error.explanationZh;
  return primary.trim() || secondary.trim();
}

/** "Other ways to say it" chips for expression-tier suggestions. */
export function AlternativesList({
  alternatives,
  className,
}: {
  alternatives: string[] | undefined;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("languageCheck.results.alternatives")}
      </p>
      <ul className="mt-1 space-y-1">
        {alternatives.map((a) => (
          <li
            key={a}
            className="rounded-md border bg-muted/50 px-2 py-1 text-sm leading-snug"
          >
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Red-strikethrough → green chips, e.g. "of receiving" → "regarding". */
export function DiffChips({
  original,
  correction,
}: {
  original: string;
  correction: string;
}) {
  const { t } = useTranslation();
  const changes = diffChanges(original, correction);
  if (changes.length === 0) return null;
  return (
    <div className="flex flex-col items-start gap-1.5">
      {changes.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5 text-sm">
          {c.removed ? (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700 line-through decoration-red-700/70 dark:bg-red-950 dark:text-red-300">
              {c.removed}
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs italic text-muted-foreground">
              {t("languageCheck.results.insert")}
            </span>
          )}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {c.added ? (
            <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
              {c.added}
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs italic text-muted-foreground">
              {t("languageCheck.results.delete")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

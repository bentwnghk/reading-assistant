"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { buildSegments } from "@/utils/languageCheck";
import {
  LANGUAGE_CHECK_CATEGORIES,
  isExpressionCategory,
  type LanguageCheckCategory,
} from "@/constants/languageCheck";
import ErrorSpan from "@/components/LanguageCheck/ErrorSpan";
import CorrectionCard from "@/components/LanguageCheck/CorrectionCard";
import {
  categoryStyle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface ResultsViewProps {
  essay: LanguageCheckEssay;
  language: ExplanationLanguage;
}

/**
 * Essay with inline highlights (left) and a scrollable column of correction
 * cards (right). Highlights ↔ cards are cross-linked.
 */
export default function ResultsView({ essay, language }: ResultsViewProps) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Categories the user has switched off. Ephemeral view state: the essay's
  // data and numbering are never affected, only what is drawn.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  // Offsets are relative to the snapshot that was checked, never the live transcript.
  const text = essay.checkedText;
  const segments = useMemo(
    () => buildSegments(text, essay.corrections),
    [text, essay.corrections],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of essay.corrections) {
      map.set(e.category, (map.get(e.category) ?? 0) + 1);
    }
    return LANGUAGE_CHECK_CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c as LanguageCheckCategory,
      count: map.get(c) ?? 0,
    }));
  }, [essay.corrections]);

  const errorCounts = counts.filter((c) => !isExpressionCategory(c.category));
  const suggestionCounts = counts.filter((c) => isExpressionCategory(c.category));

  const totalCount = essay.corrections.length;
  const visibleCount = essay.corrections.filter(
    (e) => !hidden.has(e.category),
  ).length;

  function toggleCategory(category: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  /** Hide a whole tier, or show it again if every chip in it is already off. */
  function toggleTier(tier: { category: LanguageCheckCategory }[]) {
    setHidden((prev) => {
      const next = new Set(prev);
      const allOff = tier.every((c) => next.has(c.category));
      for (const c of tier) {
        if (allOff) next.delete(c.category);
        else next.add(c.category);
      }
      return next;
    });
  }

  // Selecting from either side scrolls the counterpart into view.
  function handleSelect(id: string, source: "text" | "card") {
    setActiveId(id);
    const target = document.getElementById(
      source === "text" ? `lc-card-${id}` : `lc-err-${id}`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Drop the highlight and filter when switching essays.
  useEffect(() => {
    setActiveId(null);
    setHidden(new Set());
  }, [essay.id]);

  // A hidden correction can't stay "active" (nothing on screen to point at).
  const shownActiveId =
    activeId &&
    essay.corrections.some((e) => e.id === activeId && !hidden.has(e.category))
      ? activeId
      : null;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {counts.length > 0 && (
        <div className="flex flex-col gap-2" aria-label={t("languageCheck.results.legend")}>
          {[
            { key: "errors", title: t("languageCheck.results.tierErrors"), tier: errorCounts },
            { key: "suggestions", title: t("languageCheck.results.tierSuggestions"), tier: suggestionCounts },
          ]
            .filter((row) => row.tier.length > 0)
            .map(({ key, title, tier }) => {
              const allOff = tier.every((c) => hidden.has(c.category));
              return (
                <div key={key} role="group" aria-label={title} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {title}
                  </span>
                  {tier.map(({ category, count }) => {
                    const on = !hidden.has(category);
                    const label = categoryLabel(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={on}
                        title={t(
                          on
                            ? "languageCheck.results.hideCategory"
                            : "languageCheck.results.showCategory",
                          { category: label },
                        )}
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          on
                            ? "bg-card hover:bg-accent"
                            : "border-dashed bg-transparent text-muted-foreground hover:bg-accent/50",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            on
                              ? categoryStyle(category).dot
                              : "border border-muted-foreground/60",
                          )}
                        />
                        <span className={cn(!on && "line-through")}>{label}</span>
                        <span className="font-semibold tabular-nums text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleTier(tier)}
                  >
                    {allOff
                      ? t("languageCheck.results.showTier")
                      : t("languageCheck.results.hideTier")}
                  </Button>
                </div>
              );
            })}
          {hidden.size > 0 && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {t("languageCheck.results.showing", {
                shown: visibleCount,
                total: totalCount,
              })}
            </span>
          )}
        </div>
      )}

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 rounded-xl border bg-card p-5 sm:p-8 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
          <p
            className="whitespace-pre-wrap break-words text-lg leading-[2.4rem]"
            lang="en"
          >
            {segments.map((seg, i) =>
              seg.kind === "text" || hidden.has(seg.error.category) ? (
                <span key={i}>{seg.text}</span>
              ) : (
                <ErrorSpan
                  key={seg.error.id}
                  error={seg.error}
                  number={seg.number}
                  text={seg.text}
                  language={language}
                  active={shownActiveId === seg.error.id}
                  onSelect={(id) => handleSelect(id, "text")}
                />
              ),
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-1">
          {essay.corrections.map((error, i) =>
            hidden.has(error.category) ? null : (
              <CorrectionCard
                key={error.id}
                error={error}
                // Numbers come from the full list so they match the highlights
                // and stay stable while categories are toggled.
                number={i + 1}
                text={text}
                language={language}
                active={shownActiveId === error.id}
                onSelect={(id) => handleSelect(id, "card")}
              />
            ),
          )}
          {totalCount > 0 && visibleCount === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("languageCheck.results.allHidden")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";
import { buildSegments } from "@/utils/languageCheck";
import {
  LANGUAGE_CHECK_CATEGORIES,
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

  // Selecting from either side scrolls the counterpart into view.
  function handleSelect(id: string, source: "text" | "card") {
    setActiveId(id);
    const target = document.getElementById(
      source === "text" ? `lc-card-${id}` : `lc-err-${id}`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Drop the highlight when switching essays.
  useEffect(() => setActiveId(null), [essay.id]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {counts.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          aria-label={t("languageCheck.results.legend")}
        >
          {counts.map(({ category, count }) => (
            <span
              key={category}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"
            >
              <span
                className={cn("h-2.5 w-2.5 rounded-full", categoryStyle(category).dot)}
              />
              {categoryLabel(category)}
              <span className="font-semibold tabular-nums text-muted-foreground">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 rounded-xl border bg-card p-5 sm:p-8 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
          <p
            className="whitespace-pre-wrap break-words text-lg leading-[2.4rem]"
            lang="en"
          >
            {segments.map((seg, i) =>
              seg.kind === "text" ? (
                <span key={i}>{seg.text}</span>
              ) : (
                <ErrorSpan
                  key={seg.error.id}
                  error={seg.error}
                  number={seg.number}
                  text={seg.text}
                  language={language}
                  active={activeId === seg.error.id}
                  onSelect={(id) => handleSelect(id, "text")}
                />
              ),
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-1">
          {essay.corrections.map((error, i) => (
            <CorrectionCard
              key={error.id}
              error={error}
              number={i + 1}
              text={text}
              language={language}
              active={activeId === error.id}
              onSelect={(id) => handleSelect(id, "card")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";
import { LANGUAGE_CHECK_LEARN_RANGES } from "@/constants/languageCheck";

export function useRange(initial: number) {
  return useState<number>(initial);
}

/** Time-window picker shared by the student and staff dashboards. */
export default function LearnRangeTabs({
  value,
  onChange,
}: {
  value: number;
  onChange: (range: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label={t("languageCheck.learnData.range.label")}>
      {LANGUAGE_CHECK_LEARN_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === r ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r === 0 ? t("languageCheck.learnData.range.all") : t("languageCheck.learnData.range.days", { count: r })}
        </button>
      ))}
    </div>
  );
}

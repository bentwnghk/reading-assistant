"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { categoryStyle, useCategoryLabel } from "@/components/LanguageCheck/shared";
import useLanguageCheckLearnData from "@/hooks/useLanguageCheckLearnData";
import type { LearnEventRow } from "@/utils/languageCheckLearnWire";

const PAGE_SIZE = 20;

const TONE: Partial<Record<LearnEventRow["type"], string>> = {
  session_started: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  session_resumed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  session_completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  quiz_completed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  practice_completed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  generation_failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  session_deleted: "bg-muted text-muted-foreground",
};

interface Props {
  endpoint: string;
  /** Extra query (range, class, student…); `page`/`pageSize` are added here. */
  query: Record<string, string | undefined>;
  showUser?: boolean;
}

/** One-line description of an event, from its stored details. */
function useDescribe() {
  const { t } = useTranslation();
  return (e: LearnEventRow): string => {
    const d = e.details;
    const base = t(`languageCheck.learnData.events.${e.type}`, { defaultValue: e.type });
    switch (e.type) {
      case "practice_answered":
        return `${base} — ${t(d.correct ? "languageCheck.learnData.right" : "languageCheck.learnData.wrong")}`;
      case "quiz_answered":
        return `${base} — ${t(d.correct ? "languageCheck.learnData.right" : "languageCheck.learnData.wrong")}`;
      case "quiz_completed":
        return `${base}: ${d.percent}% (${d.correct}/${d.total})`;
      case "practice_completed":
        return `${base}: ${d.percent}%`;
      case "session_started":
        return `${base} · ${t("languageCheck.learnData.topicCount", { count: Number(d.units) || 0 })}`;
      case "session_completed":
        return d.average === null || d.average === undefined ? base : `${base}: ${d.average}%`;
      case "quiz_retaken":
        return `${base} · ${t("languageCheck.learnData.round", { round: d.round })}`;
      case "practice_generated":
        return `${base} · +${d.count}`;
      case "quiz_generated":
        return `${base} · ${d.count}`;
      case "generation_failed":
        return `${base} (${d.stage})`;
      default:
        return base;
    }
  };
}

/** Newest-first activity feed of the learning page (own, or scoped for staff). */
export default function LearnActivityLog({ endpoint, query, showUser = false }: Props) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const describe = useDescribe();
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const { data, loading, error } = useLanguageCheckLearnData<{ rows: LearnEventRow[]; total: number }>(
    `${endpoint}?${params.toString()}`,
  );

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (!data && loading) {
    return (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error && !data) {
    return <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  }
  if (!data || data.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("languageCheck.learnData.noActivity")}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", loading && "opacity-60")}>
      <ul className="divide-y rounded-lg border">
        {data.rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatDateTime(e.createdAt)}
            </span>
            {showUser && (
              <span className="max-w-[10rem] shrink-0 truncate font-medium" title={e.userEmail}>
                {e.userName}
              </span>
            )}
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                TONE[e.type] ?? "bg-muted text-foreground",
              )}
            >
              {describe(e)}
            </span>
            {e.category && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", categoryStyle(e.category).dot)} />
                {categoryLabel(e.category)}
              </span>
            )}
            {e.essayTitle && (
              <span className="min-w-0 max-w-[14rem] truncate text-xs text-muted-foreground">
                {e.essayTitle}
              </span>
            )}
          </li>
        ))}
      </ul>
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            {t("languageCheck.staff.page", { page: safePage, total: totalPages })}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

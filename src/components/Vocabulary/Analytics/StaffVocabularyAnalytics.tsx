"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SegmentedTabs } from "@/components/LanguageCheck/shared";
import LearnRangeTabs from "@/components/LanguageCheck/Learn/LearnRangeTabs";
import useLanguageCheckLearnData, { browserTimeZone } from "@/hooks/useLanguageCheckLearnData";
import StaffFilterBar, {
  EMPTY_STAFF_SELECTION,
  type StaffSelection,
} from "@/components/LanguageCheck/StaffFilterBar";
import VocabularyDashboardView, {
  Delta,
  MODE_ICON,
  PercentBadge,
} from "./VocabularyDashboardView";
import { cn } from "@/utils/style";
import { getMasteryColor } from "@/utils/srs";
import { formatDateTime } from "@/utils/formatDate";
import type {
  VocabularyActivityRow,
  VocabularyAnalyticsData,
  VocabularyStaffSessionRow,
} from "@/utils/vocabularyAnalyticsWire";

type Tab = "overview" | "sessions" | "activity";
const PAGE_SIZE = 20;
const STUDENTS_ENDPOINT = "/api/vocabulary/analytics/students";

interface Props {
  role: string | undefined;
  /** Open this student's word bank (read-only) in the main view. */
  onOpenStudent: (userId: string, name: string) => void;
}

type Filters = Record<string, string | undefined>;

/**
 * Staff "Student analytics" panel on /vocabulary: class dashboard, per-student
 * progress and every learner's review sessions (read only), plus the activity
 * feed. Scope: teacher → students in their classes, admin → their school,
 * super-admin → everyone. Students never reach this component.
 */
export default function StaffVocabularyAnalytics({ role, onOpenStudent }: Props) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<StaffSelection>(EMPTY_STAFF_SELECTION);
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState(30);

  const filters: Filters = {
    classId: selection.classId ?? undefined,
    userId: selection.userId ?? undefined,
  };

  return (
    <section className="flex flex-col gap-3">
      <StaffFilterBar
        role={role}
        value={selection}
        onChange={setSelection}
        studentsEndpoint={STUDENTS_ENDPOINT}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={(["overview", "sessions", "activity"] as const).map((x) => ({
            value: x,
            label: t(`vocabulary.analytics.tabs.${x}`),
          }))}
        />
        <LearnRangeTabs value={range} onChange={setRange} />
      </div>

      {tab === "overview" && (
        <Overview
          range={range}
          filters={filters}
          selectedUser={selection.userId}
          onPickStudent={(userId) => setSelection({ ...selection, userId })}
          onOpenStudent={onOpenStudent}
        />
      )}
      {tab === "sessions" && (
        <StaffSessions key={`${range}|${filters.classId}|${filters.userId}`} range={range} filters={filters} />
      )}
      {tab === "activity" && (
        <ActivityFeed key={`${range}|${filters.classId}|${filters.userId}`} range={range} filters={filters} />
      )}
    </section>
  );
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  const safe = Math.min(page, totalPages);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={safe <= 1} onClick={() => onPage(safe - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="px-2 text-xs text-muted-foreground">
        {t("languageCheck.staff.page", { page: safe, total: totalPages })}
      </span>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={safe >= totalPages} onClick={() => onPage(safe + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-8">
      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function query(filters: Filters, extra: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  return params.toString();
}

function Overview({
  range,
  filters,
  selectedUser,
  onPickStudent,
  onOpenStudent,
}: {
  range: number;
  filters: Filters;
  selectedUser: string | null;
  onPickStudent: (id: string) => void;
  onOpenStudent: (id: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const filterKey = `${range}|${filters.classId}|${filters.userId}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(1);
  }

  const { data, loading, error, reload } = useLanguageCheckLearnData<VocabularyAnalyticsData>(
    `/api/vocabulary/analytics/dashboard?${query(filters, {
      range: String(range),
      tz: browserTimeZone(),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })}`,
  );

  if (!data) {
    return loading ? (
      <Loading />
    ) : (
      <div className="space-y-2 py-6 text-center text-sm text-red-600">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          {t("languageCheck.staff.refresh")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", loading && "opacity-60")}>
      <VocabularyDashboardView data={data} />

      {data.students.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.studentsTitle")}
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[60rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t("languageCheck.staff.colStudent")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colBank")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colMastered")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colDue")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colSessions")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colTrend")}</th>
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colLastActive")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.userId} className={cn("border-b last:border-0", selectedUser === s.userId && "bg-primary/5")}>
                    <td className="max-w-[14rem] px-3 py-2">
                      <button
                        type="button"
                        className="block max-w-full text-left hover:underline"
                        onClick={() => onPickStudent(s.userId)}
                        title={t("vocabulary.analytics.filterToStudent")}
                      >
                        <span className="block truncate font-medium">{s.userName}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.userEmail}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.words + s.phrases}
                      {s.phrases > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({t("vocabulary.analytics.phraseCount", { count: s.phrases })})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{s.mastered}</td>
                    <td className="px-3 py-2">
                      <span className={cn("tabular-nums", s.due > 0 && "font-medium text-orange-600 dark:text-orange-400")}>
                        {s.due}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{s.sessions}</td>
                    <td className="px-3 py-2"><PercentBadge value={s.accuracy} /></td>
                    <td className="px-3 py-2"><Delta value={s.trend} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {s.lastActiveAt ? formatDateTime(s.lastActiveAt) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onOpenStudent(s.userId, s.userName)}>
                        <Eye className="mr-1 h-4 w-4" />
                        {t("vocabulary.analytics.openVocabulary")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.studentsTotal} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

function StaffSessions({ range, filters }: { range: number; filters: Filters }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<VocabularyStaffSessionRow | null>(null);

  const { data, loading, error } = useLanguageCheckLearnData<{
    rows: VocabularyStaffSessionRow[];
    total: number;
  }>(
    `/api/vocabulary/analytics/sessions?${query(filters, {
      range: String(range),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })}`,
  );

  if (!data) {
    return loading ? <Loading /> : <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  }
  if (data.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("vocabulary.analytics.noSessions")}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", loading && "opacity-60")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("languageCheck.staff.colStudent")}</th>
              <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colMode")}</th>
              <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colType")}</th>
              <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colReviewed")}</th>
              <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
              <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colWhen")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((s) => {
              const Icon = MODE_ICON[s.mode];
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="max-w-[12rem] py-2 pr-3">
                    <span className="block truncate font-medium">{s.userName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.userEmail}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {t(`vocabulary.analytics.mode.${s.mode}`)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{t(`vocabulary.analytics.entry.${s.entryType}`)}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {s.correctCount}/{s.totalWords}
                  </td>
                  <td className="py-2 pr-3"><PercentBadge value={s.accuracy} /></td>
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{formatDateTime(s.completedAt)}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(s)}>
                      <Eye className="mr-1 h-4 w-4" />
                      {t("languageCheck.staff.view")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data.total} onPage={setPage} />
      <SessionDetailDialog session={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function SessionDetailDialog({
  session,
  onClose,
}: {
  session: VocabularyStaffSessionRow | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data, loading, error } = useLanguageCheckLearnData<VocabularyReviewSession>(
    session
      ? `/api/vocabulary/review-sessions?id=${encodeURIComponent(session.id)}&userId=${encodeURIComponent(session.userId)}`
      : null,
  );
  const results = session && data?.id === session.id ? data.results ?? [] : [];

  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {session && `${t(`vocabulary.analytics.mode.${session.mode}`)} · ${session.accuracy}%`}
          </DialogTitle>
          <DialogDescription>
            {session && `${session.userName} · ${formatDateTime(session.completedAt)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          {loading && !results.length ? (
            <Loading />
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colWord")}</th>
                  <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colResult")}</th>
                  <th className="py-2 pr-3 font-medium">{t("vocabulary.analytics.colAttempts")}</th>
                  <th className="py-2 font-medium">{t("vocabulary.analytics.colLevel")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.word} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{r.word}</td>
                    <td className="py-1.5 pr-3">
                      <span className={r.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {r.rating
                          ? t(`vocabulary.analytics.rating.${r.rating}`)
                          : t(r.correct ? "vocabulary.analytics.correct" : "vocabulary.analytics.incorrect")}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.attempts ?? 1}</td>
                    <td className="py-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getMasteryColor(r.masteryAfter))}>
                        {r.masteryAfter === 0 ? t("vocabulary.analytics.levelNew") : `L${r.masteryAfter}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivityFeed({ range, filters }: { range: number; filters: Filters }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, loading, error } = useLanguageCheckLearnData<{
    rows: VocabularyActivityRow[];
    total: number;
  }>(
    `/api/vocabulary/analytics/activity?${query(filters, {
      range: String(range),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })}`,
  );

  if (!data) {
    return loading ? <Loading /> : <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  }
  if (data.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("vocabulary.analytics.noActivity")}
      </p>
    );
  }

  const describe = (e: VocabularyActivityRow): string => {
    const d = e.details;
    const kind = e.entryType ? t(`vocabulary.analytics.entry.${e.entryType}`) : "";
    if (e.type === "session_completed") {
      return t("vocabulary.analytics.events.session_completed", {
        mode: t(`vocabulary.analytics.mode.${String(d.mode)}`, { defaultValue: String(d.mode) }),
        correct: Number(d.correct) || 0,
        total: Number(d.total) || 0,
        accuracy: Number(d.accuracy) || 0,
      });
    }
    return t("vocabulary.analytics.events.words_added", {
      count: Number(d.count) || 1,
      kind: kind.toLowerCase(),
    });
  };

  return (
    <div className={cn("space-y-3", loading && "opacity-60")}>
      <ul className="divide-y rounded-lg border">
        {data.rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(e.createdAt)}</span>
            <span className="max-w-[10rem] shrink-0 truncate font-medium" title={e.userEmail}>{e.userName}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                e.type === "session_completed"
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                  : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
              )}
            >
              {describe(e)}
            </span>
          </li>
        ))}
      </ul>
      <Pager page={page} total={data.total} onPage={setPage} />
    </div>
  );
}

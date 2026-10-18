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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SegmentedTabs,
  categoryStyle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import LearnActivityLog from "@/components/LanguageCheck/Learn/LearnActivityLog";
import LearnDashboardView, {
  Delta,
  PercentBadge,
  formatMinutes,
} from "@/components/LanguageCheck/Learn/LearnDashboardView";
import LearnRangeTabs, { useRange } from "@/components/LanguageCheck/Learn/LearnRangeTabs";
import LearnExportMenu from "@/components/LanguageCheck/Learn/LearnExportMenu";
import LearnSessionDetail from "@/components/LanguageCheck/Learn/LearnSessionDetail";
import useLanguageCheckLearnData, { browserTimeZone } from "@/hooks/useLanguageCheckLearnData";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";
import type {
  LearnStaffDashboardData,
  LearnStaffSessionDetailWire,
  LearnStaffSessionSummary,
} from "@/utils/languageCheckLearnWire";

type Tab = "overview" | "sessions" | "activity";
const PAGE_SIZE = 20;

interface StaffLearningProps {
  /** Shared class / student selection from the staff filter bar (null = all). */
  classId: string | null;
  userId: string | null;
  onPickStudent: (userId: string) => void;
}

/**
 * Staff "Student learning" tab on /language-check: class-level dashboard,
 * per-student progress over time, every learner's sessions (read only) and the
 * activity feed. Scope matches the essay log — teacher → students in their
 * classes, admin → their school, super-admin → everyone. Class and student come
 * from the shared staff filter bar. Students never reach this component.
 */
export default function StaffLearning({ classId, userId, onPickStudent }: StaffLearningProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useRange(30);

  const filters: Record<string, string | undefined> = {
    classId: classId ?? undefined,
    userId: userId ?? undefined,
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={(["overview", "sessions", "activity"] as const).map((x) => ({
            value: x,
            label: t(`languageCheck.learnData.staffTabs.${x}`),
          }))}
        />
        {tab !== "sessions" && <LearnRangeTabs value={range} onChange={setRange} />}
      </div>

      {tab === "overview" && (
        <Overview
          range={range}
          filters={filters}
          onPickStudent={onPickStudent}
          selectedUser={userId}
        />
      )}
      {tab === "sessions" && (
        <StaffSessions key={`${classId}|${userId}`} filters={filters} />
      )}
      {tab === "activity" && (
        <LearnActivityLog
          key={`${range}|${classId}|${userId}`}
          endpoint="/api/language-check/learn/staff/activity"
          query={{ range: String(range), ...filters }}
          showUser
        />
      )}
    </section>
  );
}

function Overview({
  range,
  filters,
  onPickStudent,
  selectedUser,
}: {
  range: number;
  filters: Record<string, string | undefined>;
  onPickStudent: (id: string) => void;
  selectedUser: string | null;
}) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    range: String(range),
    tz: browserTimeZone(),
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const { data, loading, error, reload } = useLanguageCheckLearnData<LearnStaffDashboardData>(
    `/api/language-check/learn/staff/dashboard?${params.toString()}`,
  );

  // Any filter change goes back to the first page of students.
  const filterKey = `${range}|${filters.classId}|${filters.userId}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(1);
  }

  if (!data) {
    return loading ? (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
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

  const totalPages = Math.max(1, Math.ceil(data.studentsTotal / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className={cn("space-y-4", loading && "opacity-60")}>
      <LearnDashboardView data={data} showLearners />

      {data.students.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("languageCheck.learnData.studentsTitle")}
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t("languageCheck.staff.colStudent")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colSessions")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colQuizzes")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colAverage")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colImprovement")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colPractice")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colWeakest")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colTime")}</th>
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colLastActive")}</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr
                    key={s.userId}
                    className={cn("border-b last:border-0", selectedUser === s.userId && "bg-primary/5")}
                  >
                    <td className="max-w-[14rem] px-3 py-2">
                      <button
                        type="button"
                        className="block max-w-full text-left hover:underline"
                        onClick={() => onPickStudent(s.userId)}
                        title={t("languageCheck.learnData.filterToStudent")}
                      >
                        <span className="block truncate font-medium">{s.userName}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.userEmail}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.sessionsCompleted}/{s.sessionsStarted}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{s.quizzesCompleted}</td>
                    <td className="px-3 py-2"><PercentBadge value={s.avgQuizPercent} /></td>
                    <td className="px-3 py-2"><Delta value={s.improvement} /></td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.practiceAccuracy === null ? "—" : `${s.practiceAccuracy}%`}
                    </td>
                    <td className="px-3 py-2">
                      {s.weakest ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", categoryStyle(s.weakest.category).dot)} />
                          <span className="truncate">{categoryLabel(s.weakest.category)}</span>
                          <span className="tabular-nums text-muted-foreground">{s.weakest.percent}%</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{formatMinutes(s.activeMinutes, t)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {s.lastActiveAt ? formatDateTime(s.lastActiveAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.studentsTotal > PAGE_SIZE && (
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
      )}
    </div>
  );
}

function StaffSessions({ filters }: { filters: Record<string, string | undefined> }) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LearnStaffSessionDetailWire | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const { data, loading, error } = useLanguageCheckLearnData<{
    rows: LearnStaffSessionSummary[];
    total: number;
  }>(`/api/language-check/learn/staff/sessions?${params.toString()}`);

  async function openDetail(id: string) {
    setDetailId(id);
    try {
      const res = await fetch(`/api/language-check/learn/staff/sessions/${id}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDetail(body as LearnStaffSessionDetailWire);
    } catch (e) {
      toast.error(parseError(e));
    } finally {
      setDetailId(null);
    }
  }

  if (!data) {
    return loading ? (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ) : (
      <p className="py-6 text-center text-sm text-red-600">{error}</p>
    );
  }
  if (data.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("languageCheck.learnData.noSessionsStaff")}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className={cn("space-y-3", loading && "opacity-60")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("languageCheck.staff.colStudent")}</th>
              <th className="py-2 pr-3 font-medium">{t("languageCheck.staff.colTitle")}</th>
              <th className="py-2 pr-3 font-medium">{t("languageCheck.learnData.colTopics")}</th>
              <th className="py-2 pr-3 font-medium">{t("languageCheck.learnData.colAverage")}</th>
              <th className="py-2 pr-3 font-medium">{t("languageCheck.staff.colStatus")}</th>
              <th className="py-2 pr-3 font-medium">{t("languageCheck.staff.colUpdated")}</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="max-w-[12rem] py-2 pr-3">
                  <span className="block truncate font-medium">{s.userName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.userEmail}</span>
                </td>
                <td className="max-w-[12rem] truncate py-2 pr-3">
                  {s.essayTitle || t("languageCheck.list.untitled")}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {s.units.map((u) => (
                      <span
                        key={u.category}
                        className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]"
                        title={categoryLabel(u.category)}
                      >
                        <span className={cn("h-2 w-2 rounded-full", categoryStyle(u.category).dot)} />
                        {u.quizPercent === null ? "—" : `${u.quizPercent}%`}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-3"><PercentBadge value={s.avgQuizPercent} /></td>
                <td className="py-2 pr-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      s.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {t(`languageCheck.learnData.status.${s.status}`)} ({s.unitsCompleted}/{s.unitCount})
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{formatDateTime(s.updatedAt)}</td>
                <td className="whitespace-nowrap py-2 text-right">
                  <Button variant="ghost" size="sm" disabled={detailId === s.id} onClick={() => void openDetail(s.id)}>
                    {detailId === s.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Eye className="mr-1 h-4 w-4" />
                        {t("languageCheck.staff.view")}
                      </>
                    )}
                  </Button>
                  <LearnExportMenu
                    sessionId={s.id}
                    status={s.status}
                    endpoint={`/api/language-check/learn/staff/sessions/${s.id}`}
                    variant="ghost"
                    iconOnly
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.total > PAGE_SIZE && (
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="h-[92vh] max-w-[min(95vw,64rem)] grid-rows-[auto_minmax(0,1fr)]">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {detail?.session.essayTitle || t("languageCheck.list.untitled")}
            </DialogTitle>
            <DialogDescription>
              {detail && `${detail.user.name} · ${detail.user.email}`}
            </DialogDescription>
          </DialogHeader>
          {detail && <LearnSessionDetail session={detail.session} rounds={detail.rounds} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

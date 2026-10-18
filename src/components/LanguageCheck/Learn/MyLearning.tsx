"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  LoaderCircle,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";
import { learnUrl } from "@/utils/languageCheckLearn";
import {
  SegmentedTabs,
  categoryStyle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import LearnActivityLog from "@/components/LanguageCheck/Learn/LearnActivityLog";
import LearnDashboardView, { PercentBadge } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import LearnExportMenu from "@/components/LanguageCheck/Learn/LearnExportMenu";
import LearnRangeTabs, { useRange } from "@/components/LanguageCheck/Learn/LearnRangeTabs";
import LearnSessionDetail from "@/components/LanguageCheck/Learn/LearnSessionDetail";
import useLanguageCheckLearnData, { browserTimeZone } from "@/hooks/useLanguageCheckLearnData";
import { useLanguageCheckLearnStore } from "@/store/languageCheckLearn";
import type {
  LearnDashboardData,
  LearnSessionDetailWire,
  LearnSessionSummary,
} from "@/utils/languageCheckLearnWire";

type Tab = "sessions" | "dashboard" | "activity";
const PAGE_SIZE = 8;

/**
 * The learner's own learning history on /language-check ("My learning" tab):
 * every saved "Learn from your mistakes" session (resume on any device), a
 * dashboard of progress over time and the activity log.
 */
export default function MyLearning() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("sessions");
  const [range, setRange] = useRange(30);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={(["sessions", "dashboard", "activity"] as const).map((x) => ({
            value: x,
            label: t(`languageCheck.learnData.tabs.${x}`),
          }))}
        />
        {tab !== "sessions" && <LearnRangeTabs value={range} onChange={setRange} />}
      </div>

      {tab === "sessions" && <SessionsList />}
      {tab === "dashboard" && <OwnDashboard range={range} />}
      {tab === "activity" && (
        <LearnActivityLog
          key={range}
          endpoint="/api/language-check/learn/activity"
          query={{ range: String(range) }}
        />
      )}
    </section>
  );
}

function OwnDashboard({ range }: { range: number }) {
  const { t } = useTranslation();
  const params = new URLSearchParams({ range: String(range), tz: browserTimeZone() });
  const { data, loading, error, reload } = useLanguageCheckLearnData<LearnDashboardData>(
    `/api/language-check/learn/dashboard?${params.toString()}`,
  );
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
  return (
    <div className={cn(loading && "opacity-60")}>
      <LearnDashboardView data={data} />
    </div>
  );
}

function SessionsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const categoryLabel = useCategoryLabel();
  const active = useLanguageCheckLearnStore((s) => s.session);
  const { data, loading, error, reload } = useLanguageCheckLearnData<LearnSessionSummary[]>(
    "/api/language-check/learn",
  );
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LearnSessionDetailWire | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LearnSessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function openDetail(id: string) {
    setDetailId(id);
    try {
      // The history view: unfinished practice/quiz content is withheld server-side.
      const res = await fetch(`/api/language-check/learn/${id}/review`);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDetail(body as LearnSessionDetailWire);
    } catch (e) {
      toast.error(parseError(e));
    } finally {
      setDetailId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // Anything still queued for this session must not resurrect it.
      await useLanguageCheckLearnStore.getState().flush();
      const res = await fetch(`/api/language-check/learn/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      if (useLanguageCheckLearnStore.getState().session?.key === toDelete.id) {
        useLanguageCheckLearnStore.getState().reset();
      }
      setToDelete(null);
      reload();
    } catch (e) {
      toast.error(parseError(e));
    } finally {
      setDeleting(false);
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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-10 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">
          {t("languageCheck.learnData.noSessions")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", loading && "opacity-60")}>
      <ul className="flex flex-col gap-2">
        {visible.map((s) => (
          <li key={s.id} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.essayTitle || t("languageCheck.list.untitled")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(s.updatedAt)} ·{" "}
                  {t("languageCheck.learnData.unitsProgress", {
                    done: s.unitsCompleted,
                    total: s.unitCount,
                  })}
                </p>
              </div>
              {s.avgQuizPercent !== null && <PercentBadge value={s.avgQuizPercent} />}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  s.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                )}
              >
                {t(`languageCheck.learnData.status.${s.status}`)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={s.status === "completed" ? "outline" : "default"}
                  onClick={() => router.push(learnUrl(s.id))}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {s.status === "completed"
                    ? t("languageCheck.learnData.review")
                    : t("languageCheck.learnData.resume")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={detailId === s.id}
                  onClick={() => void openDetail(s.id)}
                  title={t("languageCheck.learnData.viewDetail")}
                >
                  {detailId === s.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <LearnExportMenu sessionId={s.id} status={s.status} variant="ghost" iconOnly />
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  title={t("languageCheck.list.delete")}
                  onClick={() => setToDelete(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.units.map((u) => (
                <span
                  key={u.category}
                  className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
                >
                  <span className={cn("h-2 w-2 rounded-full", categoryStyle(u.category).dot)} />
                  {categoryLabel(u.category)}
                  <PercentBadge value={u.quizPercent} />
                </span>
              ))}
            </div>
            {active?.key === s.id && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {t("languageCheck.learnData.openHere")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {rows.length > PAGE_SIZE && (
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
            <DialogDescription className="sr-only">
              {t("languageCheck.learnData.viewDetail")}
            </DialogDescription>
          </DialogHeader>
          {detail && <LearnSessionDetail session={detail.session} rounds={detail.rounds} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("languageCheck.learnData.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("languageCheck.learnData.deleteDesc", {
                title: toDelete?.essayTitle || t("languageCheck.list.untitled"),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              {t("languageCheck.cancel")}
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("languageCheck.list.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

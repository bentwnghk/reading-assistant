"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  FileText,
  LoaderCircle,
  PenLine,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StaffEssayDialog from "@/components/LanguageCheck/StaffEssayDialog";
import { Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import { useCategoryLabel, categoryStyle } from "@/components/LanguageCheck/shared";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { parseError } from "@/utils/error";
import { cn } from "@/utils/style";
import {
  SCORE_KEYS,
  percentOf,
  percentTone,
  type ScoreKey,
} from "@/utils/languageCheckTopicReport";

const BACK_URL = "/writing-assessment?view=students&tab=reports";

/** Criterion accent (kept distinct from the error-category hues). */
const CRITERION: Record<ScoreKey, { icon: string; ring: string }> = {
  content: { icon: "bg-sky-500", ring: "text-sky-500" },
  language: { icon: "bg-violet-500", ring: "text-violet-500" },
  organization: { icon: "bg-emerald-500", ring: "text-emerald-500" },
  features: { icon: "bg-amber-500", ring: "text-amber-500" },
};

type StudentSort = "overall" | "name" | "words";

function fmt(n: number | null): string {
  return n === null ? "—" : String(n);
}

/** Circular progress ring with the value in the middle. */
function Ring({ percent, tone, children }: { percent: number | null; tone: string; children: React.ReactNode }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className={cn("stroke-current transition-all", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
        {children}
      </div>
    </div>
  );
}

export default function TopicReportContainer() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const topicId = params.get("topic");
  const role = session?.user?.role;
  const isStaff = role === "teacher" || role === "admin" || role === "super-admin";

  const [report, setReport] = useState<LanguageCheckTopicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<StudentSort>("overall");
  const [showTopic, setShowTopic] = useState(false);
  const categoryLabel = useCategoryLabel();

  useEffect(() => {
    if (!session) return;
    if (!isStaff || !topicId) {
      router.replace("/writing-assessment");
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/writing-assessment/staff/topic-reports/${encodeURIComponent(topicId)}`,
          { signal: ac.signal },
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setReport(body as LanguageCheckTopicReport);
        setLoading(false);
      } catch (error) {
        if (ac.signal.aborted) return;
        toast.error(parseError(error));
        router.replace(BACK_URL);
      }
    })();
    return () => ac.abort();
  }, [session, isStaff, topicId, reloadKey, router]);

  const students = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (report?.students ?? []).filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
    const by: Record<StudentSort, (a: LanguageCheckTopicReportStudent, b: LanguageCheckTopicReportStudent) => number> = {
      overall: (a, b) => (b.overall ?? -1) - (a.overall ?? -1) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      words: (a, b) => b.wordCount - a.wordCount,
    };
    return [...list].sort(by[sort]);
  }, [report, query, sort]);

  if (loading || !report) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { max, averages, topic } = report;
  const overallPct = percentOf(averages.overall, max.overall);
  // Roster completion is per STUDENT; checkedCount counts essay rows (mirrors
  // the card and the essay log), so the ratio must not divide rows by roster.
  const completion =
    report.studentCount && report.studentCount > 0
      ? Math.round((report.doneStudents / report.studentCount) * 100)
      : null;
  const distMax = Math.max(1, ...report.distribution);
  const bands = [
    { key: "veryLow", color: "bg-red-500" },
    { key: "low", color: "bg-orange-500" },
    { key: "fair", color: "bg-amber-500" },
    { key: "good", color: "bg-lime-500" },
    { key: "excellent", color: "bg-green-500" },
  ] as const;
  const errMax = Math.max(1, ...report.commonErrors.map((e) => e.count));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => router.push(BACK_URL)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("languageCheck.reports.back")}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BookMarked className="h-6 w-6 shrink-0 text-primary" />
              <span className="min-w-0">{topic.title || t("languageCheck.list.untitled")}</span>
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {topic.className ?? t("languageCheck.reports.noClass")}
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[topic.essayType]?.label ?? topic.essayType}
              </span>
              <span className="text-muted-foreground">
                {t("languageCheck.reports.outOf", { max: max.overall })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {topic.topic && (
              <Button variant="outline" size="sm" onClick={() => setShowTopic((v) => !v)}>
                <FileText className="mr-1.5 h-4 w-4" />
                {showTopic ? t("languageCheck.reports.hideTask") : t("languageCheck.reports.showTask")}
              </Button>
            )}
            <Button
              size="sm"
              disabled={report.checkedCount === 0}
              title={report.checkedCount === 0 ? t("languageCheck.aiReport.needChecked") : undefined}
              className="bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-sm hover:from-violet-700 hover:to-sky-700"
              onClick={() =>
                window.open(
                  `/writing-assessment/topic-report/ai?topic=${encodeURIComponent(topic.id)}`,
                  "_blank",
                  "noopener",
                )
              }
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t("languageCheck.aiReport.button")}
            </Button>
          </div>
        </div>
        {showTopic && (
          <p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-sm leading-relaxed">
            {topic.topic}
          </p>
        )}
      </div>

      {/* ── Class performance ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3" aria-label={t("languageCheck.reports.classPerformance")}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("languageCheck.reports.classPerformance")}
        </h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SCORE_KEYS.map((k) => {
            const avg = averages[k];
            const kMax = max[k];
            const na = kMax === 0;
            const pct = na ? null : percentOf(avg, kMax);
            return (
              <div
                key={k}
                className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", na && "opacity-60")}
              >
                <Ring percent={pct} tone={CRITERION[k].ring}>
                  {na ? "—" : fmt(avg)}
                </Ring>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className={cn("h-2 w-2 rounded-full", CRITERION[k].icon)} />
                    {t(`languageCheck.assessment.criteria.${k}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {na
                      ? t("languageCheck.reports.notScored")
                      : t("languageCheck.reports.avgOutOf", { max: kMax })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            icon={Trophy}
            label={t("languageCheck.reports.avgOverall")}
            value={
              averages.overall === null ? (
                "—"
              ) : (
                <span className={percentTone(overallPct).text}>
                  {averages.overall}
                  <span className="text-sm font-normal text-muted-foreground"> / {max.overall}</span>
                </span>
              )
            }
            tone="text-green-500"
          />
          <Stat
            icon={Users}
            label={t("languageCheck.reports.submitted")}
            value={report.checkedCount}
            hint={completion !== null ? t("languageCheck.reports.percentDone", { percent: completion }) : undefined}
            tone="text-indigo-500"
          />
          <Stat
            icon={CheckCircle2}
            label={t("languageCheck.reports.highLow")}
            value={report.highest === null ? "—" : `${report.highest} / ${report.lowest}`}
            hint={t("languageCheck.reports.highLowHint")}
            tone="text-sky-500"
          />
          <Stat
            icon={PenLine}
            label={t("languageCheck.reports.avgWords")}
            value={report.avgWords === null ? "—" : Math.round(report.avgWords)}
            hint={
              report.avgErrors === null
                ? undefined
                : t("languageCheck.reports.avgErrors", { count: Math.round(report.avgErrors) })
            }
            tone="text-amber-500"
          />
        </div>

        {report.assessedCount > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("languageCheck.reports.distribution")}</p>
              <div className="flex h-28 items-end gap-3">
                {bands.map((b, i) => (
                  <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-semibold tabular-nums">{report.distribution[i]}</span>
                    <div
                      className={cn("w-full rounded-t-md", b.color)}
                      style={{ height: `${Math.max(4, (report.distribution[i] / distMax) * 80)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-3">
                {bands.map((b) => (
                  <span key={b.key} className="flex-1 text-center text-[11px] text-muted-foreground">
                    {t(`languageCheck.reports.band.${b.key}`)}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">{t("languageCheck.reports.commonErrors")}</p>
              {report.commonErrors.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("languageCheck.reports.noErrors")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.commonErrors.map((e) => (
                    <li key={e.category} className="flex items-center gap-2 text-sm">
                      <span className="w-40 shrink-0 truncate">{categoryLabel(e.category)}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", categoryStyle(e.category).dot)}
                          style={{ width: `${(e.count / errMax) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{e.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Individual students ───────────────────────────────────────── */}
      <section className="flex flex-col gap-3" aria-label={t("languageCheck.reports.students")}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("languageCheck.reports.students")} ({report.students.length})
          </h2>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("languageCheck.reports.searchStudents")}
              aria-label={t("languageCheck.reports.searchStudents")}
              className="h-9 pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as StudentSort)}>
            <SelectTrigger className="h-9 w-44" aria-label={t("languageCheck.reports.sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["overall", "name", "words"] as const).map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`languageCheck.reports.studentSort.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {students.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {report.students.length === 0
              ? t("languageCheck.reports.noStudents")
              : t("languageCheck.reports.emptySearch")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <StudentCard key={s.essayId} student={s} max={max} onOpen={() => setOpenId(s.essayId)} />
            ))}
          </div>
        )}

        {report.pending.length > 0 && (
          <div className="rounded-xl border border-dashed bg-muted/20 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("languageCheck.reports.pending", { count: report.pending.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {report.pending.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  disabled={!p.essayId}
                  onClick={() => p.essayId && setOpenId(p.essayId)}
                  title={p.email}
                  className={cn(
                    "rounded-full border bg-card px-2.5 py-1 text-xs",
                    p.essayId ? "hover:border-primary/50" : "cursor-default",
                  )}
                >
                  {p.name}
                  <span className="ml-1 text-muted-foreground">
                    · {t(`languageCheck.reports.pendingStatus.${p.status}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <StaffEssayDialog
        essayId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

function StudentCard({
  student: s,
  max,
  onOpen,
}: {
  student: LanguageCheckTopicReportStudent;
  max: LanguageCheckTopicReport["max"];
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const pct = percentOf(s.overall, max.overall);
  const tone = percentTone(pct);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
        </div>
        <div className={cn("shrink-0 rounded-lg px-2.5 py-1 text-center", tone.badge)}>
          <p className="text-lg font-bold leading-tight tabular-nums">{fmt(s.overall)}</p>
          <p className="text-[10px] leading-none opacity-80">/ {max.overall}</p>
        </div>
      </div>

      {s.overall === null ? (
        <p className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
          {t("languageCheck.reports.notAssessed")}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {SCORE_KEYS.map((k) => {
            if (max[k] === 0) return null;
            const v = s[k];
            const p = percentOf(v, max[k]);
            return (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 truncate text-muted-foreground">
                  {t(`languageCheck.assessment.criteria.${k}`).replace(/\s*\(.\)$/, "")}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", percentTone(p).bar)}
                    style={{ width: `${p ?? 0}%` }}
                  />
                </div>
                <span className="w-9 text-right font-medium tabular-nums">
                  {fmt(v)}
                  <span className="text-muted-foreground">/{max[k]}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        {t("languageCheck.list.words", { count: s.wordCount })}
        <span className="mx-1">·</span>
        {t("languageCheck.list.errors", { count: s.errorCount })}
      </p>
    </button>
  );
}

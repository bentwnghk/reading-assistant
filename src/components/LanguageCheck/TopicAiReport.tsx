"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  LoaderCircle,
  Printer,
  Sparkles,
  Target,
  ThumbsUp,
  Users,
  XCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExplanationLanguageToggle,
  categoryStyle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { parseError } from "@/utils/error";
import { exportFollowUpDocx, type FollowUpItem } from "@/utils/languageCheckFollowUpExport";
import { cn } from "@/utils/style";
import { percentOf, percentTone, SCORE_KEYS, type ScoreKey } from "@/utils/languageCheckTopicReport";
import { groupStudents, newSubmissionsSince, type StudentInsight } from "@/utils/languageCheckAiReport";

const CRITERION: Record<ScoreKey, { hex: string; bar: string; soft: string; text: string }> = {
  content: { hex: "#0ea5e9", bar: "bg-sky-500", soft: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900", text: "text-sky-700 dark:text-sky-300" },
  language: { hex: "#8b5cf6", bar: "bg-violet-500", soft: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900", text: "text-violet-700 dark:text-violet-300" },
  organization: { hex: "#10b981", bar: "bg-emerald-500", soft: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900", text: "text-emerald-700 dark:text-emerald-300" },
  features: { hex: "#f59e0b", bar: "bg-amber-500", soft: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900", text: "text-amber-700 dark:text-amber-300" },
};

const LEVEL: Record<string, string> = {
  strength: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  developing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  priority: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const TIER_STYLE = {
  support: { dot: "bg-red-500", box: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30" },
  developing: { dot: "bg-amber-500", box: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30" },
  secure: { dot: "bg-green-500", box: "border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/30" },
} as const;

/** Radar of criterion averages as % of marks available (≥3 scored criteria). */
function Radar({ items }: { items: { key: ScoreKey; label: string; pct: number }[] }) {
  const size = 260;
  const c = size / 2;
  const R = 82;
  const n = items.length;
  const pt = (i: number, f: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * R * f, c + Math.sin(a) * R * f];
  };
  const poly = (f: (i: number) => number) =>
    items.map((_, i) => pt(i, f(i)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-64 w-64" role="img">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={poly(() => f)} fill="none" className="stroke-muted-foreground/25" strokeWidth="1" />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-muted-foreground/25" />;
      })}
      <polygon
        points={poly((i) => Math.max(0.03, items[i].pct / 100))}
        fill="#8b5cf6"
        fillOpacity="0.25"
        stroke="#8b5cf6"
        strokeWidth="2"
      />
      {items.map((it, i) => {
        const [x, y] = pt(i, Math.max(0.03, it.pct / 100));
        const [lx, ly] = pt(i, 1.32);
        return (
          <g key={it.key}>
            <circle cx={x} cy={y} r="4" fill={CRITERION[it.key].hex} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[10px] font-medium">
              {it.label}
            </text>
            <text x={lx} y={ly + 11} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">
              {it.pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 break-inside-avoid">
      <h2 className={cn("flex items-center gap-2 text-lg font-bold", tone)}>
        <Icon className="h-5 w-5" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TopicAiReport() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const topicId = params.get("topic");
  const isStaff = ["teacher", "admin", "super-admin"].includes(session?.user?.role ?? "");
  const { generateTopicAiReport, generateFollowUpExercises } = useLanguageCheck();
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const setLanguage = useLanguageCheckStore((s) => s.setExplanationLanguage);
  const categoryLabel = useCategoryLabel();

  const [report, setReport] = useState<LanguageCheckAiReport | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[] | null>(null);
  const [schoolName, setSchoolName] = useState<string | null | undefined>(undefined);
  const started = useRef(false);

  const backUrl = topicId
    ? `/writing-assessment/topic-report?topic=${encodeURIComponent(topicId)}`
    : "/writing-assessment";

  async function generate() {
    if (!topicId || generating) return;
    setGenerating(true);
    try {
      const saved = await generateTopicAiReport(topicId, language);
      setReport(saved);
      // New report snapshot: the previously generated worksheet no longer matches.
      setFollowUpItems(null);
      setCurrentCount(saved.essayCount);
      toast.success(t("languageCheck.aiReport.done"));
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    if (!isStaff || !topicId) {
      router.replace("/writing-assessment");
      return;
    }
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/writing-assessment/staff/topic-reports/${encodeURIComponent(topicId)}/ai-report`,
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setCurrentCount(body.currentCount ?? 0);
        if (body.saved) {
          setReport(body.saved as LanguageCheckAiReport);
        } else {
          void generate();
        }
      } catch (error) {
        toast.error(parseError(error));
        router.replace(backUrl);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isStaff, topicId]);

  /** The school name tops the worksheet; fetched once and cached (the status
   * route returns it for any staff viewer, subscription or not). */
  async function resolveSchoolName(): Promise<string | undefined> {
    let school = schoolName;
    if (school === undefined) {
      school = await fetch("/api/subscription/school/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((b: { schoolName?: unknown } | null) => (typeof b?.schoolName === "string" && b.schoolName ? b.schoolName : null))
        .catch(() => null);
      setSchoolName(school);
    }
    return school ?? undefined;
  }

  async function downloadFollowUp(items: FollowUpItem[]) {
    if (!report || followUpBusy) return;
    setFollowUpBusy(true);
    try {
      await exportFollowUpDocx({ report, items, language, schoolName: await resolveSchoolName(), t, categoryLabel });
      toast.success(t("languageCheck.followUp.done"));
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setFollowUpBusy(false);
    }
  }

  async function generateFollowUp() {
    if (!report || followUpBusy) return;
    setFollowUpBusy(true);
    try {
      const items = await generateFollowUpExercises(report, categoryLabel);
      setFollowUpItems(items);
      await exportFollowUpDocx({ report, items, language, schoolName: await resolveSchoolName(), t, categoryLabel });
      toast.success(t("languageCheck.followUp.done"));
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setFollowUpBusy(false);
    }
  }

  if (loading || (!report && generating)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
        <p className="font-medium">{t("languageCheck.aiReport.generating")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t("languageCheck.aiReport.generatingHint")}</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Button onClick={() => void generate()}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {t("languageCheck.aiReport.generate")}
        </Button>
        <Button variant="ghost" onClick={() => router.push(backUrl)}>
          {t("languageCheck.aiReport.backToTopic")}
        </Button>
      </div>
    );
  }

  const { base, insights, categories, essayCount } = report;
  const { max, averages, topic } = base;
  const overallPct = percentOf(averages.overall, max.overall);
  const scored = SCORE_KEYS.filter((k) => max[k] > 0);
  const radarItems = scored.map((k) => ({
    key: k,
    label: t(`languageCheck.assessment.criteria.${k}`),
    pct: percentOf(averages[k], max[k]) ?? 0,
  }));
  const analysed = Math.max(1, base.students.length);
  const errCats = categories.filter((c) => !c.expression).slice(0, 8);
  const sugCats = categories.filter((c) => c.expression).slice(0, 4);
  const catMax = Math.max(1, ...categories.map((c) => c.students));
  const distMax = Math.max(1, ...base.distribution);
  const bands = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-green-500"];
  const bandKeys = ["veryLow", "low", "fair", "good", "excellent"] as const;
  const groups = groupStudents(base.students, max);
  const stale = newSubmissionsSince(report, currentCount);
  const exampleFor = (cat: string) => categories.find((c) => c.category === cat)?.examples ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-10 print:gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit print:hidden" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("languageCheck.aiReport.backToTopic")}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight">{t("languageCheck.aiReport.title")}</h1>
            <p className="mt-1 text-lg text-muted-foreground">{topic.title}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {topic.className && <span className="font-semibold text-primary">{topic.className}</span>}
              <span>· {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[topic.essayType]?.label ?? topic.essayType}</span>
              <span>· {t("languageCheck.aiReport.analysed", { count: essayCount })}</span>
              <span>· {t("languageCheck.aiReport.generatedOn", { date: new Date(report.generatedAt).toLocaleString() })}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ExplanationLanguageToggle language={language} onChange={setLanguage} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              {t("languageCheck.aiReport.print")}
            </Button>
            {insights.mistakes.length > 0 &&
              (followUpItems === null ? (
                <Button
                  size="sm"
                  disabled={followUpBusy}
                  className="bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-sm hover:from-violet-700 hover:to-sky-700"
                  onClick={() => void generateFollowUp()}
                >
                  {followUpBusy ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {followUpBusy ? t("languageCheck.followUp.generating") : t("languageCheck.followUp.button")}
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      disabled={followUpBusy}
                      title={t("languageCheck.followUp.button")}
                      className="bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-sm hover:from-violet-700 hover:to-sky-700"
                    >
                      {followUpBusy ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                      {followUpBusy ? t("languageCheck.followUp.generating") : t("languageCheck.followUp.button")}
                      <ChevronDown className="ml-1 h-4 w-4 text-white/80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => void downloadFollowUp(followUpItems)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t("languageCheck.followUp.downloadAgain")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void generateFollowUp()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("languageCheck.followUp.regenerate")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            <Button variant="outline" size="sm" disabled={generating} onClick={() => void generate()}>
              {generating ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />}
              {t("languageCheck.aiReport.regenerate")}
            </Button>
          </div>
        </div>
        {stale > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 print:hidden">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("languageCheck.aiReport.stale", { count: stale })}</span>
          </div>
        )}
      </div>

      {/* Hero: overview */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-50 via-background to-sky-50 p-5 dark:from-violet-950/30 dark:to-sky-950/20 md:p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-5 w-5" />
              {t("languageCheck.aiReport.overview")}
            </h2>
            <p className="text-xl font-semibold leading-snug">{insights.headline}</p>
            <p className="leading-relaxed text-muted-foreground">{insights.summary}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("languageCheck.reports.avgOverall")}</p>
                <p className={cn("text-2xl font-bold tabular-nums", percentTone(overallPct).text)}>
                  {averages.overall ?? "—"}
                  <span className="text-sm font-normal text-muted-foreground"> / {max.overall}</span>
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("languageCheck.reports.highLow")}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {base.highest ?? "—"}
                  <span className="text-sm font-normal text-muted-foreground"> / {base.lowest ?? "—"}</span>
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("languageCheck.reports.avgWords")}</p>
                <p className="text-2xl font-bold tabular-nums">{base.avgWords === null ? "—" : Math.round(base.avgWords)}</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("languageCheck.aiReport.errorsPerEssay")}</p>
                <p className="text-2xl font-bold tabular-nums">{base.avgErrors === null ? "—" : Math.round(base.avgErrors)}</p>
              </div>
            </div>
          </div>
          {radarItems.length >= 3 && <Radar items={radarItems} />}
        </div>
      </section>

      {/* Criteria */}
      <Section icon={Target} title={t("languageCheck.aiReport.criteria")} tone="text-sky-700 dark:text-sky-300">
        <div className="grid gap-4 md:grid-cols-2">
          {scored.map((k) => {
            const pct = percentOf(averages[k], max[k]);
            const ai = insights.criteria.find((c) => c.key === k);
            return (
              <div key={k} className={cn("flex flex-col gap-3 rounded-2xl border p-4", CRITERION[k].soft)}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={cn("font-bold", CRITERION[k].text)}>{t(`languageCheck.assessment.criteria.${k}`)}</h3>
                  {ai && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", LEVEL[ai.level])}>
                      {t(`languageCheck.aiReport.level.${ai.level}`)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-semibold tabular-nums">
                      {averages[k] ?? "—"} / {max[k]}
                    </span>
                    <span className="text-muted-foreground">{pct ?? "—"}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background/80">
                    <div className={cn("h-full rounded-full", CRITERION[k].bar)} style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </div>
                {ai && (
                  <>
                    <p className="text-sm leading-relaxed">{ai.finding}</p>
                    <p className="flex items-start gap-1.5 rounded-lg bg-background/70 p-2 text-sm">
                      <ArrowRight className={cn("mt-0.5 h-4 w-4 shrink-0", CRITERION[k].text)} />
                      <span>{ai.nextStep}</span>
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Distribution + strengths */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 break-inside-avoid">
          <h3 className="font-semibold">{t("languageCheck.reports.distribution")}</h3>
          <div className="flex h-36 items-end gap-3">
            {base.distribution.map((n, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold tabular-nums">{n}</span>
                <div className={cn("w-full rounded-t-md", bands[i])} style={{ height: `${Math.max(4, (n / distMax) * 80)}%` }} />
                <span className="text-[11px] text-muted-foreground">{t(`languageCheck.reports.band.${bandKeys[i]}`)}</span>
              </div>
            ))}
          </div>
        </div>
        <Section icon={ThumbsUp} title={t("languageCheck.aiReport.strengths")} tone="text-green-700 dark:text-green-400">
          <ul className="flex flex-col gap-2">
            {insights.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 rounded-xl border border-green-200 bg-green-50/70 p-3 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <p className="text-sm">
                  <span className="font-semibold">{s.title}. </span>
                  {s.detail}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Mistake frequency chart */}
      {categories.length > 0 && (
        <Section icon={AlertTriangle} title={t("languageCheck.aiReport.frequency")} tone="text-red-700 dark:text-red-400">
          <p className="-mt-1 text-sm text-muted-foreground">{t("languageCheck.aiReport.frequencyHint")}</p>
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            {[...errCats, ...sugCats].map((c) => (
              <div key={c.category} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate">
                  {categoryLabel(c.category)}
                  {c.expression && <span className="ml-1 text-[10px] text-muted-foreground">({t("languageCheck.aiReport.suggestion")})</span>}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", categoryStyle(c.category).dot, c.expression && "opacity-60")}
                    style={{ width: `${(c.students / catMax) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {t("languageCheck.aiReport.studentsCount", { count: c.students, percent: Math.round((c.students / analysed) * 100) })}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Common mistakes + practice */}
      {insights.mistakes.length > 0 && (
        <Section icon={XCircle} title={t("languageCheck.aiReport.mistakes")} tone="text-red-700 dark:text-red-400">
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.mistakes.map((m, i) => {
              const ex = exampleFor(m.category);
              const stat = categories.find((c) => c.category === m.category);
              return (
                <div key={i} className={cn("flex flex-col gap-3 rounded-2xl border border-l-4 bg-card p-4 break-inside-avoid", categoryStyle(m.category).border)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{m.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", categoryStyle(m.category).badge)}>
                      {categoryLabel(m.category)}
                    </span>
                  </div>
                  {stat && (
                    <p className="text-xs text-muted-foreground">
                      {t("languageCheck.aiReport.studentsCount", { count: stat.students, percent: Math.round((stat.students / analysed) * 100) })}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{m.rule}</p>
                  {ex.slice(0, 2).map((e, j) => (
                    <div key={j} className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <p className="flex items-start gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {e.before}
                          <span className="line-through decoration-red-400/60">{e.original}</span>
                          {e.after}
                        </span>
                      </p>
                      <p className="mt-1 flex items-start gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {e.before}
                          <span className="font-medium">{e.correction || t("languageCheck.aiReport.delete")}</span>
                          {e.after}
                        </span>
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {(language === "zh" ? e.explanationZh : e.explanation) || e.explanation}
                      </p>
                    </div>
                  ))}
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{m.tip}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Priorities */}
      {insights.priorities.length > 0 && (
        <Section icon={Target} title={t("languageCheck.aiReport.priorities")} tone="text-orange-700 dark:text-orange-400">
          <ol className="flex flex-col gap-3">
            {insights.priorities.map((p, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border bg-card p-4 break-inside-avoid">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{p.title}</h3>
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t("languageCheck.aiReport.minutes", { count: p.minutes })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.why}</p>
                  <p className="mt-2 rounded-lg bg-orange-50 p-2 text-sm dark:bg-orange-950/30">{p.activity}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Differentiation */}
      {groups.length > 0 && (
        <Section icon={Users} title={t("languageCheck.aiReport.differentiation")} tone="text-indigo-700 dark:text-indigo-300">
          <p className="-mt-1 text-sm text-muted-foreground">{t("languageCheck.aiReport.differentiationHint")}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {(["support", "developing", "secure"] as const).map((tier) => {
              const list: StudentInsight[] = groups
                .filter((g) => g.tier === tier)
                .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));
              return (
                <div key={tier} className={cn("flex flex-col gap-2 rounded-2xl border p-4 break-inside-avoid", TIER_STYLE[tier].box)}>
                  <h3 className="flex items-center gap-2 font-bold">
                    <span className={cn("h-2.5 w-2.5 rounded-full", TIER_STYLE[tier].dot)} />
                    {t(`languageCheck.aiReport.tier.${tier}`)}
                    <span className="ml-auto text-sm font-normal text-muted-foreground">{list.length}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{t(`languageCheck.aiReport.tierHint.${tier}`)}</p>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {list.map((g) => (
                        <li key={g.student.userId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{g.student.name}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                            {g.weakest && tier !== "secure" && (
                              <span className={cn("rounded px-1.5 py-0.5", CRITERION[g.weakest].soft, CRITERION[g.weakest].text)}>
                                {t(`languageCheck.assessment.criteria.${g.weakest}`)}
                              </span>
                            )}
                            <span className="tabular-nums">{g.percent}%</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Quick tips */}
      {insights.quickTips.length > 0 && (
        <section className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 break-inside-avoid dark:border-yellow-800 dark:bg-yellow-950/30">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-yellow-800 dark:text-yellow-300">
            <Lightbulb className="h-5 w-5" />
            {t("languageCheck.aiReport.quickTips")}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-yellow-900 dark:text-yellow-200">
            {insights.quickTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">{t("languageCheck.aiReport.disclaimer", { model: report.model })}</p>
    </div>
  );
}

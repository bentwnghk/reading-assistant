"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Award,
  BookOpenCheck,
  ClipboardList,
  Gamepad2,
  GraduationCap,
  Sparkles,
  SpellCheck,
  TriangleAlert,
  TrendingUp,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/Dashboard/StatCard"
import { cn } from "@/utils/style"
import {
  PASS_THRESHOLD,
  STRUGGLE_THRESHOLD,
  TIER_COLORS,
  computeActivityStats,
  computeAtRiskStudents,
  computeOverview,
  tierOf,
  type ActivityKey,
  type ActivityStat,
} from "@/utils/assignmentStats"

/** Per-activity presentation metadata. Colors mirror the student-view score tiles. */
const ACTIVITY_META: Record<
  ActivityKey,
  { labelKey: string; icon: React.ReactNode; accent: string }
> = {
  testScore: {
    labelKey: "assignments.teacherView.testScoreCol",
    icon: <BookOpenCheck className="h-3.5 w-3.5" />,
    accent: "#14b8a6", // teal
  },
  vocabularyQuizScore: {
    labelKey: "assignments.teacherView.vocabCol",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    accent: "#3b82f6", // blue
  },
  spellingGameBestScore: {
    labelKey: "assignments.teacherView.spellingCol",
    icon: <SpellCheck className="h-3.5 w-3.5" />,
    accent: "#ec4899", // pink
  },
  grammarQuizScore: {
    labelKey: "assignments.teacherView.grammarQuizCol",
    icon: <GraduationCap className="h-3.5 w-3.5" />,
    accent: "#d946ef", // fuchsia
  },
  grammarGameAccuracy: {
    labelKey: "assignments.teacherView.grammarGameCol",
    icon: <Gamepad2 className="h-3.5 w-3.5" />,
    accent: "#f59e0b", // amber
  },
}

function pct(value: number | null | undefined): string {
  if (value == null) return "—"
  return `${Math.round(value)}%`
}

function num(value: number | null | undefined): string {
  if (value == null) return "—"
  return String(Math.round(value))
}

function PerformanceTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: PerformanceBarDatum }>
}) {
  const { t } = useTranslation()
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium">{d.label}</p>
      <p className="flex justify-between gap-4">
        <span className="text-muted-foreground">{t("assignments.stats.tooltip.mean")}</span>
        <span className="font-medium tabular-nums">{num(d.mean)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-muted-foreground">{t("assignments.stats.tooltip.median")}</span>
        <span className="font-medium tabular-nums">{num(d.median)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-muted-foreground">{t("assignments.stats.tooltip.participated")}</span>
        <span className="font-medium tabular-nums">
          {d.attempted}/{d.total}
        </span>
      </p>
    </div>
  )
}

interface PerformanceBarDatum {
  key: ActivityKey
  label: string
  mean: number | null
  median: number | null
  attempted: number
  total: number
  fill: string
}

/**
 * A self-contained "Class insights" panel for an assignment's roster.
 * Renders only when there is at least one assigned student. All numbers are
 * derived client-side from the roster that the detail page already fetches.
 */
export function AssignmentStats({ roster }: { roster: AssignmentSubmission[] }) {
  const { t } = useTranslation()

  const overview = useMemo(() => computeOverview(roster), [roster])
  const activityStats = useMemo(() => computeActivityStats(roster), [roster])
  const atRisk = useMemo(() => computeAtRiskStudents(roster), [roster])

  const hasAnyAttempt = activityStats.some((a) => a.attempted > 0)

  // Hardest-first bar chart data. Descending by mean so, in a vertical chart,
  // the lowest-scoring (hardest) activity sits at the top. Only percentage-scale
  // activities belong here — the axis is fixed at 0–100, so raw point totals
  // (spelling) would be meaningless. Activities with no attempts are excluded.
  const chartData: PerformanceBarDatum[] = useMemo(() => {
    return activityStats
      .filter((a) => a.scale === "percentage" && a.mean != null)
      .map((a) => toDatum(a, t, overview.totalStudents))
      .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
  }, [activityStats, t, overview.totalStudents])

  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Sparkles className="h-4 w-4" />}
        title={t("assignments.stats.sectionTitle")}
        subtitle={t("assignments.stats.sectionSubtitle")}
      />

      {/* 1. Overview strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("assignments.stats.overview.assessed")}
          value={
            <span className="tabular-nums">
              {overview.assessedStudents}
              <span className="text-muted-foreground text-base font-normal">
                {" "}
                / {overview.totalStudents}
              </span>
            </span>
          }
          sub={t("assignments.stats.overview.assessedSub")}
          color="text-primary"
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label={t("assignments.stats.overview.participation")}
          value={pct(hasAnyAttempt ? overview.avgParticipation : null)}
          sub={t("assignments.stats.overview.participationSub")}
          color="text-emerald-500"
        />
        <StatCard
          icon={<Award className="h-3.5 w-3.5" />}
          label={t("assignments.stats.overview.classAvg")}
          value={num(hasAnyAttempt ? overview.classAverage : null)}
          sub={t("assignments.stats.overview.classAvgSub")}
          color="text-indigo-500"
        />
        <StatCard
          icon={<TriangleAlert className="h-3.5 w-3.5" />}
          label={t("assignments.stats.overview.atRisk")}
          value={
            <span className={overview.atRiskCount > 0 ? "text-amber-500" : ""}>
              {overview.atRiskCount}
            </span>
          }
          sub={t("assignments.stats.overview.atRiskSub", {
            threshold: STRUGGLE_THRESHOLD,
          })}
          color="text-amber-500"
        />
      </div>

      {/* 2. Performance by activity (hardest-first bar chart) */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("assignments.stats.performance.title")}
            </h3>
            <p className="text-xs text-muted-foreground/70">
              {t("assignments.stats.performance.subtitle")}
            </p>
          </div>
          <TierLegend passLine />
        </div>
        {chartData.length === 0 ? (
          <EmptyHint text={t("assignments.stats.performance.noData")} />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44 + 24)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
              barCategoryGap={10}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11 }}
                width={104}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<PerformanceTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
              <ReferenceLine
                x={PASS_THRESHOLD}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Bar dataKey="mean" radius={[0, 4, 4, 0]} maxBarSize={26}>
                {chartData.map((d) => (
                  <Cell key={d.key} fill={d.fill} />
                ))}
                <LabelList
                  dataKey="mean"
                  position="right"
                  formatter={(v: unknown) => num(typeof v === "number" ? v : null)}
                  className="fill-foreground text-[11px] font-medium tabular-nums"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Participation & mastery grid */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          {t("assignments.stats.participation.title")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {activityStats.map((stat) => (
            <ParticipationCard key={stat.key} stat={stat} total={overview.totalStudents} />
          ))}
        </div>
      </div>

      {/* 4. At-risk students */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("assignments.stats.atRisk.title")}
            </h3>
            <p className="text-xs text-muted-foreground/70">
              {t("assignments.stats.atRisk.subtitle", { threshold: STRUGGLE_THRESHOLD })}
            </p>
          </div>
          {overview.atRiskCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {overview.atRiskCount}
            </Badge>
          )}
        </div>
        {atRisk.length === 0 ? (
          <EmptyHint
            text={t("assignments.stats.atRisk.none")}
            tone="positive"
          />
        ) : (
          <ul className="divide-y">
            {atRisk.map((s) => (
              <li key={s.studentId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={s.studentImage || undefined} />
                    <AvatarFallback>
                      {s.studentName?.[0] || s.studentEmail?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {s.studentName || t("assignments.teacherView.notStarted")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.studentEmail}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-0.5">
                    {t("assignments.stats.atRisk.weakAreas")}
                  </span>
                  {s.weakAreas.map((w) => {
                    const meta = ACTIVITY_META[w.key]
                    return (
                      <span
                        key={w.key}
                        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 tabular-nums dark:bg-red-900/40 dark:text-red-300"
                      >
                        {t(meta.labelKey)}
                        <span className="text-red-500 dark:text-red-400">{w.score}</span>
                      </span>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function toDatum(
  a: ActivityStat,
  t: (k: string) => string,
  total: number,
): PerformanceBarDatum {
  return {
    key: a.key,
    label: t(ACTIVITY_META[a.key].labelKey),
    mean: a.mean,
    median: a.median,
    attempted: a.attempted,
    total,
    fill: TIER_COLORS[tierOf(a.mean)],
  }
}

function ParticipationCard({ stat, total }: { stat: ActivityStat; total: number }) {
  const { t } = useTranslation()
  const meta = ACTIVITY_META[stat.key]
  const isPercentage = stat.scale === "percentage"
  const dist = stat.distribution
  const notStarted = total - stat.attempted

  // Percentage activities: a 4-segment tier strip (below / mid / pass / not-started).
  // Points activities: a neutral participation-only strip (attempted / not-started).
  const tierSegments =
    dist != null
      ? [
          { count: dist.below, color: TIER_COLORS.below },
          { count: dist.mid, color: TIER_COLORS.mid },
          { count: dist.pass, color: TIER_COLORS.pass },
        ]
      : [{ count: stat.attempted, color: meta.accent }]

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span style={{ color: meta.accent }}>{meta.icon}</span>
        <span className="truncate font-medium text-foreground/80">{t(meta.labelKey)}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold leading-none tabular-nums">
            {pct(stat.participationRate)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {t("assignments.stats.participation.attempted")} {stat.attempted}/{total}
          </div>
        </div>
        <div className="text-right">
          {isPercentage ? (
            <>
              <div className="text-lg font-bold leading-none tabular-nums">
                {stat.passRate == null ? "—" : `${Math.round(stat.passRate)}%`}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t("assignments.stats.participation.passed")}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold leading-none tabular-nums">
                {num(stat.mean)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t("assignments.stats.participation.avgPts")}
              </div>
            </>
          )}
        </div>
      </div>

      {/* distribution / participation strip */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {tierSegments.map((seg, i) =>
          total > 0 ? (
            <div
              key={i}
              style={{
                width: `${(seg.count / total) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ) : null,
        )}
        {notStarted > 0 && total > 0 && (
          <div
            style={{ width: `${(notStarted / total) * 100}%` }}
            className="bg-muted-foreground/20"
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="tabular-nums">
          {isPercentage
            ? `${t("assignments.stats.participation.avg")}: ${num(stat.mean)}`
            : t("assignments.stats.participation.pointsNote")}
        </span>
        {isPercentage && dist != null && (
          <span className="tabular-nums">
            {stat.attempted > 0 ? `${dist.pass}/${dist.attempted}` : ""}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

function TierLegend({ passLine }: { passLine?: boolean }) {
  const { t } = useTranslation()
  const items: { tier: "below" | "mid" | "pass"; labelKey: string }[] = [
    { tier: "below", labelKey: "assignments.stats.legend.below" },
    { tier: "mid", labelKey: "assignments.stats.legend.mid" },
    { tier: "pass", labelKey: "assignments.stats.legend.pass" },
  ]
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
      {items.map((it) => (
        <span key={it.tier} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: TIER_COLORS[it.tier] }}
          />
          {t(it.labelKey)}
        </span>
      ))}
      {passLine && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-0 w-3 border-t border-dashed border-foreground/60" />
          {t("assignments.stats.legend.passLine", { threshold: PASS_THRESHOLD })}
        </span>
      )}
    </div>
  )
}

function EmptyHint({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "positive" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center h-[140px] text-sm rounded-lg",
        tone === "positive"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground",
      )}
    >
      {text}
    </div>
  )
}

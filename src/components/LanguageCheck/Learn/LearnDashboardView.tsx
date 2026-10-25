"use client";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Award,
  BookOpenCheck,
  Clock,
  PenLine,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/style";
import { categoryStyle, useCategoryLabel } from "@/components/LanguageCheck/shared";
import type { LearnDashboardData } from "@/utils/languageCheckLearnWire";

export const MASTERY_COLOR = {
  secure: "#22c55e",
  developing: "#f59e0b",
  review: "#ef4444",
} as const;

const CHART_COLORS = {
  practice: "#38bdf8",
  quizzes: "#6366f1",
  average: "#f97316",
};

export function formatMinutes(minutes: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (minutes < 1) return t("languageCheck.learnData.lessThanMinute");
  if (minutes < 60) return t("languageCheck.learnData.minutes", { count: minutes });
  return t("languageCheck.learnData.hoursMinutes", {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
}

export function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "text-primary",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold leading-tight tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const tone =
    value > 0 ? "text-green-600 dark:text-green-400" : value < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
  return (
    <span className={cn("font-medium tabular-nums", tone)}>
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

export function PercentBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const tone =
    value >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : value >= 50
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", tone)}>
      {value}%
    </span>
  );
}

function MasteryBar({ secure, developing, review }: { secure: number; developing: number; review: number }) {
  const total = secure + developing + review;
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-2 w-28 overflow-hidden rounded-full bg-muted" title={`${secure} / ${developing} / ${review}`}>
      <span style={{ width: w(secure), background: MASTERY_COLOR.secure }} />
      <span style={{ width: w(developing), background: MASTERY_COLOR.developing }} />
      <span style={{ width: w(review), background: MASTERY_COLOR.review }} />
    </div>
  );
}

function shortDate(bucket: string): string {
  return bucket.slice(5);
}

interface LearnDashboardViewProps {
  data: LearnDashboardData;
  /** Staff view: also show how many learners practised each topic. */
  showLearners?: boolean;
}

/** Totals, activity over time, progress over time and per-topic mastery. */
export default function LearnDashboardView({ data, showLearners = false }: LearnDashboardViewProps) {
  const { t, i18n } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { totals, series, categories, quizHistory } = data;

  if (totals.sessionsStarted === 0 && totals.lessonsViewed === 0 && totals.quizzesCompleted === 0 && series.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("languageCheck.learnData.noData")}
      </p>
    );
  }

  // One point per quiz round, so the x axis must key on something unique per
  // point: recharts resolves tooltips by axis value, and several rounds sharing
  // one day label would all show the first round of that day.
  const history = quizHistory.map((p, i) => ({
    ...p,
    idx: i,
    label: new Date(p.at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
    name: categoryLabel(p.category),
  }));
  // Show the date only on a day's first round so same-day points don't repeat it.
  const historyTicks = history.map((p, i) => (i === 0 || p.label !== history[i - 1].label ? p.label : ""));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          icon={BookOpenCheck}
          label={t("languageCheck.learnData.statSessions")}
          value={totals.sessionsStarted}
          hint={t("languageCheck.learnData.statSessionsHint", { count: totals.sessionsCompleted })}
        />
        <Stat
          icon={PenLine}
          label={t("languageCheck.learnData.statPractice")}
          value={totals.practiceAnswered}
          hint={
            totals.practiceAccuracy !== null
              ? t("languageCheck.learnData.statPracticeHint", { percent: totals.practiceAccuracy })
              : undefined
          }
          tone="text-sky-500"
        />
        <Stat
          icon={Trophy}
          label={t("languageCheck.learnData.statQuizzes")}
          value={totals.quizzesCompleted}
          hint={
            totals.avgQuizPercent !== null
              ? t("languageCheck.learnData.statQuizzesHint", { percent: totals.avgQuizPercent })
              : undefined
          }
          tone="text-indigo-500"
        />
        <Stat
          icon={TrendingUp}
          label={t("languageCheck.learnData.statImprovement")}
          value={totals.improvement === null ? "—" : <Delta value={totals.improvement} />}
          hint={t("languageCheck.learnData.statImprovementHint")}
          tone="text-green-500"
        />
        <Stat
          icon={Award}
          label={t("languageCheck.learnData.statSecure")}
          value={totals.topicsSecure}
          hint={t("languageCheck.learnData.statTopicsHint", {
            developing: totals.topicsDeveloping,
            review: totals.topicsReview,
          })}
          tone="text-green-500"
        />
        <Stat
          icon={Target}
          label={t("languageCheck.learnData.statLessons")}
          value={totals.lessonsViewed}
          tone="text-amber-500"
        />
        <Stat
          icon={Activity}
          label={t("languageCheck.learnData.statActiveDays")}
          value={totals.activeDays}
          tone="text-rose-500"
        />
        <Stat
          icon={Clock}
          label={t("languageCheck.learnData.statTime")}
          value={formatMinutes(totals.activeMinutes, t)}
          hint={t("languageCheck.learnData.statTimeHint")}
          tone="text-violet-500"
        />
      </div>

      {series.length > 0 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t(`languageCheck.learnData.chartActivity.${data.bucketUnit}`)}
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="count"
                dataKey="practiceAnswered"
                name={t("languageCheck.learnData.seriesPractice")}
                stackId="a"
                fill={CHART_COLORS.practice}
              />
              <Bar
                yAxisId="count"
                dataKey="quizzesCompleted"
                name={t("languageCheck.learnData.seriesQuizzes")}
                stackId="a"
                fill={CHART_COLORS.quizzes}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="avgQuizPercent"
                name={t("languageCheck.learnData.seriesAverage")}
                stroke={CHART_COLORS.average}
                strokeWidth={2}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length > 1 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("languageCheck.learnData.chartHistory")}
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="idx" tickFormatter={(v) => historyTicks[Number(v)] ?? ""} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value}%`, t("languageCheck.learnData.quizScore")]}
                labelFormatter={(_label, payload) => {
                  const p = payload?.[0]?.payload as (typeof history)[number] | undefined;
                  return p ? `${p.name} · ${t("languageCheck.learnData.round", { round: p.round })}` : "";
                }}
              />
              <Line
                type="monotone"
                dataKey="percent"
                stroke={CHART_COLORS.quizzes}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {categories.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colTopic")}</th>
                {showLearners && (
                  <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colLearners")}</th>
                )}
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colQuizzes")}</th>
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colLatest")}</th>
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colImprovement")}</th>
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colPractice")}</th>
                <th className="px-3 py-2 font-medium">{t("languageCheck.learnData.colMastery")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", categoryStyle(c.category).dot)} />
                      {categoryLabel(c.category)}
                    </span>
                  </td>
                  {showLearners && <td className="px-3 py-2 tabular-nums">{c.learners}</td>}
                  <td className="px-3 py-2 tabular-nums">{c.quizzes}</td>
                  <td className="px-3 py-2"><PercentBadge value={c.avgLatest} /></td>
                  <td className="px-3 py-2"><Delta value={c.improvement} /></td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.practiceAccuracy === null ? "—" : `${c.practiceAccuracy}%`}
                  </td>
                  <td className="px-3 py-2">
                    <MasteryBar secure={c.secure} developing={c.developing} review={c.review} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {(["secure", "developing", "review"] as const).map((m) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: MASTERY_COLOR[m] }} />
            {t(`languageCheck.learn.summary.levels.${m}`)}
          </span>
        ))}
        <span>{t("languageCheck.learnData.practiceNote")}</span>
      </p>
    </div>
  );
}

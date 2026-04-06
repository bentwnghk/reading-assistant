"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  FileText,
  Waypoints,
  Languages,
  BookType,
  MessageSquare,
  BookMarked,
  MessageCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import {
  DAILY_ACTIVITY_KEYS,
  DAILY_ACTIVITY_COLORS,
  type SessionScore,
} from "@/utils/dashboardMetrics";
import { StatCard, HighlightedStatCard } from "./StatCard";

const TIME_RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 180, label: "180d" },
  { days: 360, label: "360d" },
];

const SCORE_COLORS = ["#3b82f6", "#22c55e", "#f97316"];

const PIE_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(24, 95%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
];

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md max-w-[260px]">
      <p className="font-medium mb-1">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((entry, i) => (
          <p key={i} className="flex justify-between gap-4" style={{ color: entry.fill }}>
            <span>{entry.name}</span>
            <span className="font-medium tabular-nums">{entry.value}</span>
          </p>
        ))}
      <div className="border-t mt-1 pt-1 flex justify-between font-medium">
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function ScoreTrendChart({
  title,
  data,
  color,
  emptyMessage,
}: {
  title: string;
  data: SessionScore[];
  color: string;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title}>
        <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </ChartCard>
    );
  }
  const chartData = data.map((s, i) => ({ ...s, idx: i + 1 }));
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            name={title}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function formatWeekRange(weekStart: string, locale: string): string {
  const parts = weekStart.split("-").map(Number);
  const monday = new Date(parts[0], parts[1] - 1, parts[2]);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${monday.toLocaleDateString(locale, opts)} – ${sunday.toLocaleDateString(locale, opts)}`;
}

function formatDailyDate(dateStr: string, locale: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function OverviewTab() {
  const { t, i18n } = useTranslation();
  const m = useDashboardMetrics();
  const [timeRange, setTimeRange] = useState(30);

  const aiFeaturesData = useMemo(
    () => [
      { name: t("dashboard.features.summary"), value: m.summariesGenerated, fill: "#3b82f6" },
      { name: t("dashboard.features.mindMapEn"), value: m.mindMapsEnglish, fill: "#8b5cf6" },
      { name: t("dashboard.features.mindMapZh"), value: m.mindMapsChinese, fill: "#ec4899" },
      { name: t("dashboard.features.adaptedText"), value: m.adaptedTextsGenerated, fill: "#22c55e" },
      { name: t("dashboard.features.simplifiedText"), value: m.simplifiedTextsGenerated, fill: "#14b8a6" },
      { name: t("dashboard.features.sentenceAnalysis"), value: m.totalSentencesAnalyzed, fill: "#f97316" },
    ],
    [m, t]
  );

  const filteredDaily = useMemo(() => {
    if (timeRange >= 9999) return m.dailyActivities;
    const cutoff = Date.now() - timeRange * 86400000;
    return m.dailyActivities.filter((d) => {
      const parts = d.date.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getTime() >= cutoff;
    });
  }, [m.dailyActivities, timeRange]);

  const testData = useMemo(
    () => m.testScores.map((s, i) => ({ ...s, idx: i + 1 })),
    [m.testScores]
  );
  const quizData = useMemo(
    () => m.quizScores.map((s, i) => ({ ...s, idx: i + 1 })),
    [m.quizScores]
  );
  const spellingData = useMemo(
    () => m.spellingScores.map((s, i) => ({ ...s, idx: i + 1 })),
    [m.spellingScores]
  );

  const pieData = useMemo(
    () => m.scoreDistribution.filter((b) => b.count > 0),
    [m.scoreDistribution]
  );

  const hasAnyScores = testData.length > 0 || quizData.length > 0 || spellingData.length > 0;

  const isEmpty = m.totalSessions === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">{t("dashboard.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HighlightedStatCard
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.totalTexts")}
          value={m.totalSessions}
          sub={t("dashboard.stats.sourceBreakdown", {
            upload: m.sessionsBySource.upload,
            repository: m.sessionsBySource.repository,
          })}
        />
        <StatCard
          icon={<FileText className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.summaries")}
          value={m.summariesGenerated}
          color="text-blue-500"
        />
        <StatCard
          icon={<Waypoints className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.mindMaps")}
          value={m.mindMapsGenerated}
          sub={t("dashboard.stats.mindMapBreakdown", { en: m.mindMapsEnglish, zh: m.mindMapsChinese })}
          color="text-purple-500"
        />
        <StatCard
          icon={<Languages className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.adaptedTexts")}
          value={m.adaptedTextsGenerated}
          color="text-green-500"
        />
        <StatCard
          icon={<BookType className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.simplifiedTexts")}
          value={m.simplifiedTextsGenerated}
          color="text-teal-500"
        />
        <StatCard
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.sentencesAnalyzed")}
          value={m.totalSentencesAnalyzed}
          color="text-orange-500"
        />
        <StatCard
          icon={<BookMarked className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.totalVocabulary")}
          value={m.totalVocabulary}
          color="text-indigo-500"
        />
        <StatCard
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.tutorQuestions")}
          value={m.totalTutorQuestions}
          color="text-primary"
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label={t("dashboard.stats.avgProgress")}
          value={`${m.averageProgress}%`}
          color="text-emerald-500"
        />
      </div>

      {/* Daily Activity Stacked Bar Chart (full width) */}
      <ChartCard title={t("dashboard.charts.dailyActivity")}>
        <div className="flex gap-1.5 mb-3">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.days}
              variant={timeRange === range.days ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setTimeRange(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        {filteredDaily.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredDaily}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => formatDailyDate(v, i18n.language)}
                  interval={Math.max(0, Math.floor(filteredDaily.length / 8) - 1)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ActivityTooltip />} />
                {DAILY_ACTIVITY_KEYS.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={t(`dashboard.activities.${key}`)}
                    stackId="a"
                    fill={DAILY_ACTIVITY_COLORS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
              {DAILY_ACTIVITY_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: DAILY_ACTIVITY_COLORS[key] }}
                  />
                  <span className="text-muted-foreground">
                    {t(`dashboard.activities.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            {t("dashboard.charts.noData")}
          </div>
        )}
      </ChartCard>

      {/* Charts Row 1: Reading Activity + AI Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title={t("dashboard.charts.readingActivity")}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={m.sessionsOverTime}>
              <defs>
                <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="weekStart"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => formatWeekRange(v, i18n.language)}
                interval={Math.max(0, Math.floor(m.sessionsOverTime.length / 6) - 1)}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                content={<CustomTooltip />}
                labelFormatter={(v) => formatWeekRange(String(v), i18n.language)}
              />
              <Area
                type="monotone"
                dataKey="count"
                name={t("dashboard.charts.sessions")}
                stroke="#3b82f6"
                fill="url(#gradSessions)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.charts.aiFeatures")}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aiFeaturesData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {aiFeaturesData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Score Trend Charts (3 columns) */}
      {hasAnyScores && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScoreTrendChart
            title={t("dashboard.scores.readingTest")}
            data={m.testScores}
            color={SCORE_COLORS[0]}
            emptyMessage={t("dashboard.charts.noData")}
          />
          <ScoreTrendChart
            title={t("dashboard.scores.vocabQuiz")}
            data={m.quizScores}
            color={SCORE_COLORS[1]}
            emptyMessage={t("dashboard.charts.noData")}
          />
          <ScoreTrendChart
            title={t("dashboard.scores.spelling")}
            data={m.spellingScores}
            color={SCORE_COLORS[2]}
            emptyMessage={t("dashboard.charts.noData")}
          />
        </div>
      )}

      {/* Charts Row 2: Vocabulary Growth + Score Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title={t("dashboard.charts.vocabularyGrowth")}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={m.vocabularyOverTime}>
              <defs>
                <linearGradient id="gradVocab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name={t("dashboard.charts.cumulativeVocab")}
                stroke="#6366f1"
                fill="url(#gradVocab)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.charts.scoreDistribution")}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="range"
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              {t("dashboard.charts.noTestData")}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

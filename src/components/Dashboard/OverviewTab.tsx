"use client";
import { useMemo } from "react";
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
  Legend,
} from "recharts";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { StatCard, HighlightedStatCard } from "./StatCard";

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

const SCORE_COLORS = ["#3b82f6", "#22c55e", "#f97316"];

const PIE_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(24, 95%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
];

export function OverviewTab() {
  const { t } = useTranslation();
  const m = useDashboardMetrics();

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

  const scoreData = useMemo(() => {
    const allScores = [
      ...m.testScores.map((s) => ({ title: s.title, date: s.date, testScore: s.score, quizScore: null, spellingScore: null })),
      ...m.quizScores.map((s) => ({ title: s.title, date: s.date, testScore: null, quizScore: s.score, spellingScore: null })),
      ...m.spellingScores.map((s) => ({ title: s.title, date: s.date, testScore: null, quizScore: null, spellingScore: s.score })),
    ];
    allScores.sort((a, b) => a.date - b.date);
    return allScores.map((s, i) => ({ ...s, idx: i + 1 }));
  }, [m]);

  const pieData = useMemo(
    () => m.scoreDistribution.filter((b) => b.count > 0),
    [m.scoreDistribution]
  );

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

      {/* Charts Row 1: Activity Timeline + AI Features */}
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
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
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

      {/* Score Trends */}
      {(m.testScores.length > 0 || m.quizScores.length > 0 || m.spellingScores.length > 0) && (
        <ChartCard title={t("dashboard.charts.scoreTrends")}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {m.testScores.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="testScore"
                  name={t("dashboard.scores.readingTest")}
                  stroke={SCORE_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
              {m.quizScores.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="quizScore"
                  name={t("dashboard.scores.vocabQuiz")}
                  stroke={SCORE_COLORS[1]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
              {m.spellingScores.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="spellingScore"
                  name={t("dashboard.scores.spelling")}
                  stroke={SCORE_COLORS[2]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
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
              <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
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

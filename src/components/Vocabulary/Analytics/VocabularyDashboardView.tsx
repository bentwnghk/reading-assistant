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
  AlarmClock,
  BookMarked,
  Brain,
  Layers,
  Plus,
  SpellCheck,
  Target,
  Trophy,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/style";
import { Delta, PercentBadge, Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import type { VocabularyAnalyticsData } from "@/utils/vocabularyAnalyticsWire";

const COLORS = {
  reviewed: "#38bdf8",
  added: "#6366f1",
  accuracy: "#f97316",
};

const LEVEL_COLORS = ["#9ca3af", "#ef4444", "#f97316", "#eab308", "#3b82f6", "#22c55e"];

export const MODE_ICON: Record<"flashcard" | "quiz" | "spelling", LucideIcon> = {
  flashcard: Layers,
  quiz: ClipboardList,
  spelling: SpellCheck,
};

const shortDate = (bucket: string) => bucket.slice(5);

/** Totals, activity over time, mastery distribution, modes and the hardest words. */
export default function VocabularyDashboardView({ data }: { data: VocabularyAnalyticsData }) {
  const { t, i18n } = useTranslation();
  const { totals, snapshot, modes, series, hardWords, sessionHistory } = data;

  if (
    totals.sessions === 0 &&
    totals.wordsAdded === 0 &&
    snapshot.words + snapshot.phrases === 0
  ) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("vocabulary.analytics.noData")}
      </p>
    );
  }

  const bankTotal = snapshot.words + snapshot.phrases;
  const masteredPct = bankTotal > 0 ? Math.round((snapshot.mastered / bankTotal) * 100) : null;
  const levels = snapshot.levels.map((count, level) => ({
    level: level === 0 ? t("vocabulary.analytics.levelNew") : `L${level}`,
    count,
    fill: LEVEL_COLORS[level],
  }));
  const history = sessionHistory.map((p) => ({
    ...p,
    label: new Date(p.at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          icon={BookMarked}
          label={t("vocabulary.analytics.statBank")}
          value={bankTotal}
          hint={t("vocabulary.analytics.statBankHint", {
            words: snapshot.words,
            phrases: snapshot.phrases,
          })}
        />
        <Stat
          icon={Trophy}
          label={t("vocabulary.analytics.statMastered")}
          value={snapshot.mastered}
          hint={masteredPct !== null ? t("vocabulary.analytics.statMasteredHint", { percent: masteredPct }) : undefined}
          tone="text-green-500"
        />
        <Stat
          icon={AlarmClock}
          label={t("vocabulary.analytics.statDue")}
          value={snapshot.due}
          hint={t("vocabulary.analytics.statDueHint", { hard: snapshot.hard })}
          tone="text-orange-500"
        />
        <Stat
          icon={Brain}
          label={t("vocabulary.analytics.statAvgMastery")}
          value={snapshot.avgMastery === null ? "—" : snapshot.avgMastery.toFixed(1)}
          hint={t("vocabulary.analytics.statAvgMasteryHint")}
          tone="text-violet-500"
        />
        <Stat
          icon={Target}
          label={t("vocabulary.analytics.statSessions")}
          value={totals.sessions}
          hint={
            totals.accuracy !== null
              ? t("vocabulary.analytics.statSessionsHint", { percent: totals.accuracy })
              : undefined
          }
          tone="text-indigo-500"
        />
        <Stat
          icon={Layers}
          label={t("vocabulary.analytics.statReviewed")}
          value={totals.wordsReviewed}
          tone="text-sky-500"
        />
        <Stat
          icon={Plus}
          label={t("vocabulary.analytics.statAdded")}
          value={totals.wordsAdded}
          tone="text-emerald-500"
        />
        <Stat
          icon={Activity}
          label={t("vocabulary.analytics.statActiveDays")}
          value={totals.activeDays}
          tone="text-rose-500"
        />
      </div>

      {series.length > 0 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t(`vocabulary.analytics.chartActivity.${data.bucketUnit}`)}
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="count" dataKey="wordsReviewed" name={t("vocabulary.analytics.seriesReviewed")} stackId="a" fill={COLORS.reviewed} />
              <Bar yAxisId="count" dataKey="wordsAdded" name={t("vocabulary.analytics.seriesAdded")} stackId="a" fill={COLORS.added} />
              <Line yAxisId="pct" type="monotone" dataKey="accuracy" name={t("vocabulary.analytics.seriesAccuracy")} stroke={COLORS.accuracy} strokeWidth={2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bankTotal > 0 && (
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              {t("vocabulary.analytics.chartMastery")}
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={levels}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name={t("vocabulary.analytics.entries")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.modesTitle")}
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colMode")}</th>
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colSessions")}</th>
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colReviewed")}</th>
                <th className="py-1.5 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {modes.map((m) => {
                const Icon = MODE_ICON[m.mode];
                return (
                  <tr key={m.mode} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {t(`vocabulary.analytics.mode.${m.mode}`)}
                      </span>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{m.sessions}</td>
                    <td className="py-2 pr-2 tabular-nums">{m.wordsReviewed}</td>
                    <td className="py-2"><PercentBadge value={m.accuracy} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {history.length > 1 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.chartHistory")}
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value}%`, t("vocabulary.analytics.sessionAccuracy")]}
                labelFormatter={(_l, payload) => {
                  const p = payload?.[0]?.payload as (typeof history)[number] | undefined;
                  return p ? `${t(`vocabulary.analytics.mode.${p.mode}`)} · ${t("vocabulary.analytics.wordCount", { count: p.total })}` : "";
                }}
              />
              <Line type="monotone" dataKey="accuracy" stroke={COLORS.added} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hardWords.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <h4 className="px-3 pt-3 text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.hardWordsTitle")}
          </h4>
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colWord")}</th>
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colMissed")}</th>
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colLearnersMissed")}</th>
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {hardWords.map((w) => (
                <tr key={w.word} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{w.word}</td>
                  <td className="px-3 py-2 tabular-nums">{w.wrong}/{w.attempts}</td>
                  <td className="px-3 py-2 tabular-nums">{w.learners}</td>
                  <td className="px-3 py-2">
                    <PercentBadge value={Math.round(((w.attempts - w.wrong) / w.attempts) * 100)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={cn("text-[11px] text-muted-foreground")}>
        {t("vocabulary.analytics.note")}
      </p>
    </div>
  );
}

export { Delta, PercentBadge };

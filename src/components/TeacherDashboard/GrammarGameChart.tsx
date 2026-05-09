"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface GrammarGameChartProps {
  students: StudentMetrics[];
  classAvg: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
}) {
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-foreground">
          {entry.dataKey === "avgScore" ? t("teacherDashboard.avgScore") : entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function GrammarGameChart({ students, classAvg }: GrammarGameChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return students.map((s) => ({
      userName: s.userName,
      avgScore: s.grammarGameScores.length > 0
        ? Math.round(s.grammarGameScores.reduce((a, b) => a + b, 0) / s.grammarGameScores.length)
        : 0,
      sessions: s.grammarGameScores.length,
    }));
  }, [students]);

  const hasData = useMemo(() => {
    return students.some((s) => s.grammarGameScores.length > 0);
  }, [students]);

  if (!hasData) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("dashboard.scores.grammarGame")}</h3>
          <span className="text-xs text-muted-foreground">
            {t("teacherDashboard.avg")}: <strong className="text-foreground tabular-nums">{classAvg}</strong>
          </span>
        </div>
        <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("dashboard.scores.grammarGame")}</h3>
        <span className="text-xs text-muted-foreground">
          {t("teacherDashboard.avg")}: <strong className="text-foreground tabular-nums">{classAvg}</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="userName"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          {classAvg > 0 && <ReferenceLine y={classAvg} stroke="hsl(var(--foreground))" strokeDasharray="4 4" strokeWidth={1} />}
          <Bar dataKey="avgScore" name={t("teacherDashboard.avgScore")} fill="#84cc16" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

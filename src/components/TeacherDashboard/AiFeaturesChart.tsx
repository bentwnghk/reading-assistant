"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import { AI_USAGE_KEYS, AI_USAGE_COLORS } from "@/utils/teacherDashboardMetrics";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
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

interface AiFeaturesChartProps {
  students: StudentMetrics[];
  classTotal: StudentMetrics["aiUsage"];
  classAvg: StudentMetrics["aiUsage"];
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
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md max-w-[260px]">
      <p className="font-medium mb-1">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((entry, i) => (
          <p key={i} className="flex justify-between gap-4" style={{ color: entry.color }}>
            <span>{entry.name}</span>
            <span className="font-medium tabular-nums">{entry.value}</span>
          </p>
        ))}
      <div className="border-t mt-1 pt-1 flex justify-between font-medium">
        <span>{t("dashboard.activity.total")}</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

const AI_FEATURE_KEY_MAP: Record<string, string> = {
  summary: "dashboard.features.summary",
  mindMap: "dashboard.features.mindMap",
  adaptedText: "dashboard.features.adaptedText",
  simplifiedText: "dashboard.features.simplifiedText",
  sentenceAnalysis: "dashboard.features.sentenceAnalysis",
  glossary: "dashboard.features.glossary",
  tutorQuestion: "dashboard.features.tutorQuestion",
};

export default function AiFeaturesChart({ students, classTotal, classAvg }: AiFeaturesChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return students.map((s) => ({
      userName: s.userName,
      ...s.aiUsage,
    }));
  }, [students]);

  const totalSum = useMemo(() => {
    return Object.values(classTotal).reduce((a, b) => a + b, 0);
  }, [classTotal]);

  const avgSum = useMemo(() => {
    return Object.values(classAvg).reduce((a, b) => a + b, 0);
  }, [classAvg]);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("teacherDashboard.charts.aiFeatures")}</h3>
      </div>
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <span>{t("teacherDashboard.classTotal")}: <strong className="text-foreground tabular-nums">{totalSum}</strong></span>
        <span>{t("teacherDashboard.classAvg")}: <strong className="text-foreground tabular-nums">{avgSum}</strong></span>
      </div>
      {students.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      ) : (
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
            {avgSum > 0 && <ReferenceLine y={avgSum} stroke="hsl(var(--foreground))" strokeDasharray="4 4" strokeWidth={1} />}
            {AI_USAGE_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                name={t(AI_FEATURE_KEY_MAP[key])}
                stackId="a"
                fill={AI_USAGE_COLORS[key]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
        {AI_USAGE_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: AI_USAGE_COLORS[key] }} />
            <span className="text-muted-foreground">{t(AI_FEATURE_KEY_MAP[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

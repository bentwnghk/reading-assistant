"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import { VOCAB_TIME_RANGES, getVocabularyGrowthData } from "@/utils/teacherDashboardMetrics";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

const STUDENT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6",
  "#14b8a6", "#ec4899", "#eab308", "#06b6d4", "#a855f7",
  "#f43f5e", "#84cc16", "#6366f1", "#0ea5e9", "#d946ef",
  "#10b981", "#f59e0b", "#64748b", "#0891b2", "#c026d3",
];

interface VocabularyGrowthChartProps {
  students: StudentMetrics[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md max-w-[300px]">
      <p className="font-medium mb-1">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((entry, i) => (
          <p key={i} className="flex justify-between gap-4" style={{ color: entry.color }}>
            <span className="truncate">{entry.name}</span>
            <span className="font-medium tabular-nums shrink-0">{entry.value}</span>
          </p>
        ))}
    </div>
  );
}

export default function VocabularyGrowthChart({ students }: VocabularyGrowthChartProps) {
  const { t, i18n } = useTranslation();
  const [timeRange, setTimeRange] = useState(30);
  const [hiddenStudents, setHiddenStudents] = useState<Set<string>>(new Set());

  const studentNames = useMemo(() => students.map((s) => s.userName), [students]);

  const toggleStudent = (name: string) => {
    setHiddenStudents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const chartData = useMemo(() => {
    return getVocabularyGrowthData(students, timeRange);
  }, [students, timeRange]);

  const formatDailyDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
  };

  if (students.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t("teacherDashboard.charts.vocabularyGrowth")}</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t("teacherDashboard.charts.vocabularyGrowth")}</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {VOCAB_TIME_RANGES.map((range) => (
          <Button
            key={range.days}
            variant={timeRange === range.days ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setTimeRange(range.days)}
          >
            {t(range.labelKey)}
          </Button>
        ))}
      </div>
      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={formatDailyDate}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {studentNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={STUDENT_COLORS[i % STUDENT_COLORS.length]}
                  fill={STUDENT_COLORS[i % STUDENT_COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                  hide={hiddenStudents.has(name)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
            {studentNames.map((name, i) => {
              const isHidden = hiddenStudents.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  className="flex items-center gap-1.5 text-xs cursor-pointer opacity-100 hover:opacity-80 transition-opacity"
                  style={{ opacity: isHidden ? 0.35 : 1 }}
                  onClick={() => toggleStudent(name)}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: STUDENT_COLORS[i % STUDENT_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{name}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      )}
    </div>
  );
}

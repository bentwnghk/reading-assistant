"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import { getQuartileColor } from "@/utils/teacherDashboardMetrics";
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
  Cell,
} from "recharts";

interface AvgProgressChartProps {
  students: StudentMetrics[];
  classAvg: number;
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
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

export default function AvgProgressChart({ students, classAvg }: AvgProgressChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return students.map((s) => ({
      userName: s.userName,
      progress: s.avgProgress,
    }));
  }, [students]);

  const quartileColors = useMemo(
    () => getQuartileColor(chartData.map((d) => d.progress)),
    [chartData]
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("teacherDashboard.charts.avgProgress")}</h3>
        <span className="text-xs text-muted-foreground">
          {t("teacherDashboard.classAvg")}: <strong className="text-foreground tabular-nums">{classAvg}%</strong>
        </span>
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
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={classAvg} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />
            <Bar dataKey="progress" name={t("teacherDashboard.charts.avgProgress")} fill="#22c55e" radius={[4, 4, 0, 0]}>
              {chartData.map((_entry, index) => (
                <Cell key={index} fill={quartileColors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

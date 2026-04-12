"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import { QUARTILE_COLORS, getQuartileColor } from "@/utils/teacherDashboardMetrics";
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

interface TotalVocabularyChartProps {
  students: StudentMetrics[];
  classTotal: number;
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
        <p key={i} className="text-foreground">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function TotalVocabularyChart({ students, classTotal, classAvg }: TotalVocabularyChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return students.map((s) => ({
      userName: s.userName,
      vocab: s.totalVocabulary,
    }));
  }, [students]);

  const quartileColors = useMemo(
    () => getQuartileColor(chartData.map((d) => d.vocab)),
    [chartData]
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("teacherDashboard.charts.totalVocabulary")}</h3>
      </div>
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <span>{t("teacherDashboard.classTotal")}: <strong className="text-foreground tabular-nums">{classTotal}</strong></span>
        <span>{t("teacherDashboard.classAvg")}: <strong className="text-foreground tabular-nums">{classAvg}</strong></span>
      </div>
      {students.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      ) : (
        <>
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
              <ReferenceLine y={classAvg} stroke="#000" strokeDasharray="4 4" strokeWidth={1} />
              <Bar dataKey="vocab" name={t("teacherDashboard.charts.totalVocabulary")} fill="#6366f1" radius={[4, 4, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={index} fill={quartileColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
            {QUARTILE_COLORS.map((color, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{t(`teacherDashboard.quartiles.q${i + 1}`)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

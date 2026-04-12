"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
import {
  DAILY_ACTIVITY_KEYS,
  DAILY_ACTIVITY_COLORS,
  getDailyActivityForDate,
} from "@/utils/teacherDashboardMetrics";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyActivityChartProps {
  students: StudentMetrics[];
}

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
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
          <p key={i} className="flex justify-between gap-4" style={{ color: entry.fill }}>
            <span>{t(`dashboard.activities.${entry.name}`)}</span>
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

export default function DailyActivityChart({ students }: DailyActivityChartProps) {
  const { t, i18n } = useTranslation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  }, [selectedDate]);

  const chartData = useMemo(() => getDailyActivityForDate(students, dateStr), [students, dateStr]);

  const dateLabel = useMemo(() => {
    return selectedDate.toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" });
  }, [selectedDate, i18n.language]);

  const goBack = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  };

  const goForward = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      if (nd > today) return d;
      return nd;
    });
  };

  const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("teacherDashboard.charts.dailyActivity")}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium tabular-nums min-w-[120px] text-center">{dateLabel}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {students.length === 0 ? (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
          {t("dashboard.charts.noData")}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
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
                <span className="text-muted-foreground">{t(`dashboard.activities.${key}`)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

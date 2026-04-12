"use client";

import type { StudentMetrics } from "@/utils/teacherDashboardMetrics";
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

interface SpellingScoreChartProps {
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
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.dataKey === "avgScore" ? "Avg Score" : entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function SpellingScoreChart({ students, classAvg }: SpellingScoreChartProps) {
  const { title } = { title: "Spelling Score" };

  const chartData = useMemo(() => {
    return students.map((s) => ({
      userName: s.userName,
      avgScore: s.spellingScores.length > 0
        ? Math.round(s.spellingScores.reduce((a, b) => a + b, 0) / s.spellingScores.length)
        : 0,
      sessions: s.spellingScores.length,
    }));
  }, [students]);

  const hasData = useMemo(() => {
    return students.some((s) => s.spellingScores.length > 0);
  }, [students]);

  if (!hasData) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            Avg: <strong className="text-foreground tabular-nums">{classAvg}</strong>
          </span>
        </div>
        <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          Class Avg: <strong className="text-foreground tabular-nums">{classAvg}</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
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
          {classAvg > 0 && <ReferenceLine y={classAvg} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1} />}
          <Bar dataKey="avgScore" name="Avg Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

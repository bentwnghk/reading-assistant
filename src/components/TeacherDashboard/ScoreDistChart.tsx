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
  Cell,
} from "recharts";

interface ScoreBucketDef {
  range: string;
  min: number;
  max: number;
  fill: string;
}

interface ScoreDistChartProps {
  title: string;
  students: StudentMetrics[];
  scoreKey: "testScores" | "quizScores" | "spellingScores";
  buckets: readonly ScoreBucketDef[];
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
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
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
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

export default function ScoreDistChart({ title, students, scoreKey, buckets, classAvg }: ScoreDistChartProps) {
  const chartData = useMemo(() => {
    return students.map((s) => {
      const scores = s[scoreKey];
      const row: { userName: string; [bucketRange: string]: string | number } = { userName: s.userName };
      for (const bucket of buckets) {
        const count = scores.filter((sc) => sc >= bucket.min && sc <= bucket.max).length;
        row[bucket.range] = count;
      }
      return row;
    });
  }, [students, scoreKey, buckets]);

  const hasData = useMemo(() => {
    return students.some((s) => s[scoreKey].length > 0);
  }, [students, scoreKey]);

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
          Avg: <strong className="text-foreground tabular-nums">{classAvg}</strong>
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
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          {classAvg > 0 && <ReferenceLine y={classAvg} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1} />}
          {buckets.map((bucket) => (
            <Bar
              key={bucket.range}
              dataKey={bucket.range}
              name={bucket.range}
              stackId="a"
              radius={0}
            >
              {chartData.map((_entry, index) => (
                <Cell key={index} fill={bucket.fill} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
        {buckets.map((bucket) => (
          <div key={bucket.range} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: bucket.fill }} />
            <span className="text-muted-foreground">{bucket.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

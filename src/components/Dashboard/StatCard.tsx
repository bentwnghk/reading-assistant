"use client";
import { cn } from "@/utils/style";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
}

export function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={color ? color : "text-primary"}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

interface HighlightedStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

export function HighlightedStatCard({ icon, label, value, sub }: HighlightedStatCardProps) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums text-primary")}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

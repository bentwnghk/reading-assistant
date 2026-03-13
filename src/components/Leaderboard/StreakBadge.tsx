"use client";
import { Flame } from "lucide-react";
import { cn } from "@/utils/style";

interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StreakBadge({ days, size = "md", showLabel = true }: StreakBadgeProps) {
  if (days === 0) {
    return (
      <span className="text-muted-foreground text-sm">—</span>
    );
  }

  const color =
    days >= 14 ? "text-red-500" :
    days >= 7  ? "text-orange-500" :
    days >= 3  ? "text-yellow-500" :
                 "text-amber-400";

  const iconSize =
    size === "lg" ? "h-5 w-5" :
    size === "sm" ? "h-3 w-3" :
                   "h-4 w-4";

  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", color)}>
      <Flame className={cn(iconSize, days >= 3 && "animate-pulse")} />
      {showLabel && <span>{days}</span>}
    </span>
  );
}

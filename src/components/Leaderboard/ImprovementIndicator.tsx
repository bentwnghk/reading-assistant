"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";

interface ImprovementIndicatorProps {
  value: number;
  /** Whether to show as rank change (integer) vs score delta */
  isRank?: boolean;
  size?: "sm" | "md";
}

export function ImprovementIndicator({
  value,
  isRank = false,
  size = "md",
}: ImprovementIndicatorProps) {
  const { t } = useTranslation();
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (value === 0 || value === null || value === undefined) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-muted-foreground", textSize)}>
        <Minus className={iconSize} />
        <span className="hidden sm:inline">{t("leaderboard.rank.same")}</span>
      </span>
    );
  }

  // For rank changes: going UP means rank number decreases (better)
  const isPositive = isRank ? value < 0 : value > 0;
  const displayValue = Math.abs(Math.round(value));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold",
        textSize,
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
      )}
    >
      {isPositive ? (
        <TrendingUp className={iconSize} />
      ) : (
        <TrendingDown className={iconSize} />
      )}
      <span>
        {isPositive ? "+" : "−"}{displayValue}
      </span>
    </span>
  );
}

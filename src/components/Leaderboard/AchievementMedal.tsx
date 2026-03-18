"use client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen, BookText, Layers, Network, FileEdit, FileMinus,
  Search, FileCheck, Target, PenTool, Brain, Sparkles, Lock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/utils/style";
import type { AchievementState } from "@/store/achievements";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen, BookText, Layers, Network, FileEdit, FileMinus,
  Search, FileCheck, Target, PenTool, Brain, Sparkles,
};

// ─── Color maps ───────────────────────────────────────────────────────────────
const COLOR_BG: Record<string, string> = {
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  teal:   "bg-teal-500",
  pink:   "bg-pink-500",
  red:    "bg-red-500",
  cyan:   "bg-cyan-500",
};

const COLOR_GLOW: Record<string, string> = {
  blue:   "shadow-blue-400/50",
  green:  "shadow-green-400/50",
  indigo: "shadow-indigo-400/50",
  purple: "shadow-purple-400/50",
  orange: "shadow-orange-400/50",
  teal:   "shadow-teal-400/50",
  pink:   "shadow-pink-400/50",
  red:    "shadow-red-400/50",
  cyan:   "shadow-cyan-400/50",
};

const COLOR_RING: Record<string, string> = {
  blue:   "stroke-blue-500",
  green:  "stroke-green-500",
  indigo: "stroke-indigo-500",
  purple: "stroke-purple-500",
  orange: "stroke-orange-500",
  teal:   "stroke-teal-500",
  pink:   "stroke-pink-500",
  red:    "stroke-red-500",
  cyan:   "stroke-cyan-500",
};

const COLOR_TEXT: Record<string, string> = {
  blue:   "text-blue-600 dark:text-blue-400",
  green:  "text-green-600 dark:text-green-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  purple: "text-purple-600 dark:text-purple-400",
  orange: "text-orange-600 dark:text-orange-400",
  teal:   "text-teal-600 dark:text-teal-400",
  pink:   "text-pink-600 dark:text-pink-400",
  red:    "text-red-600 dark:text-red-400",
  cyan:   "text-cyan-600 dark:text-cyan-400",
};

// ─── Progress ring SVG ────────────────────────────────────────────────────────
function ProgressRing({
  pct,
  color,
  unlocked,
}: {
  pct: number;
  color: string;
  unlocked: boolean;
}) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full -rotate-90"
    >
      {/* Track */}
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        strokeWidth="5"
        className="stroke-muted-foreground/20"
      />
      {/* Progress */}
      {!unlocked && pct > 0 && (
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-700", COLOR_RING[color] ?? "stroke-primary")}
        />
      )}
      {/* Full glow ring when unlocked */}
      {unlocked && (
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          strokeWidth="5"
          className={cn(COLOR_RING[color] ?? "stroke-primary")}
        />
      )}
    </svg>
  );
}



// ─── Main component ───────────────────────────────────────────────────────────
interface AchievementMedalProps {
  achievement: AchievementState;
}

export function AchievementMedal({ achievement }: AchievementMedalProps) {
  const { t } = useTranslation();
  const { type, currentProgress, milestones, icon, color } = achievement;

  const IconComp = ICON_MAP[icon] ?? BookOpen;

  // Current highest unlocked milestone
  const highestUnlocked = useMemo(
    () => [...milestones].reverse().find((m) => m.unlocked),
    [milestones]
  );

  // Next milestone to unlock
  const nextMilestone = useMemo(
    () => milestones.find((m) => !m.unlocked),
    [milestones]
  );

  const isAnyUnlocked = !!highestUnlocked;

  // Progress towards next milestone (0-100)
  const progressPct = useMemo(() => {
    if (!nextMilestone) return 100;
    const prevTarget = highestUnlocked?.target ?? 0;
    const range = nextMilestone.target - prevTarget;
    const done = currentProgress - prevTarget;
    return Math.min(100, Math.max(0, Math.round((done / range) * 100)));
  }, [nextMilestone, highestUnlocked, currentProgress]);

  const activeLabel = nextMilestone
    ? t(`achievements.types.${type}.description`, { count: nextMilestone.target })
    : t(`achievements.types.${type}.description`, { count: highestUnlocked?.target ?? milestones[milestones.length - 1]?.target });

  const typeName = t(`achievements.types.${type}.name`);
  const hint = t(`achievements.types.${type}.hint`);

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300",
        isAnyUnlocked
          ? "border-transparent bg-gradient-to-b from-card to-card/80 shadow-lg hover:shadow-xl"
          : "border-border/50 bg-card/60 hover:border-border"
      )}
    >
      {/* Glow backdrop for unlocked */}
      {isAnyUnlocked && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-10 blur-xl transition-opacity group-hover:opacity-20",
            COLOR_BG[color] ?? "bg-primary"
          )}
        />
      )}

      {/* Medal circle with progress ring */}
      <div className="relative w-20 h-20 mb-3">
        <ProgressRing pct={progressPct} color={color} unlocked={isAnyUnlocked} />

        {/* Inner circle */}
        <div
          className={cn(
            "absolute inset-2 rounded-full flex items-center justify-center transition-all duration-300",
            isAnyUnlocked
              ? cn(
                  COLOR_BG[color] ?? "bg-primary",
                  "shadow-lg",
                  COLOR_GLOW[color] ?? ""
                )
              : "bg-muted"
          )}
        >
          {isAnyUnlocked ? (
            <IconComp
              className="w-8 h-8 text-white drop-shadow"
            />
          ) : (
            <Lock className="w-6 h-6 text-muted-foreground/50" />
          )}
        </div>

        {/* Check badge for unlocked */}
        {isAnyUnlocked && (
          <div
            className={cn(
              "absolute -bottom-1 -right-1 rounded-full bg-background p-0.5",
            )}
          >
            <CheckCircle2
              className={cn("w-5 h-5", COLOR_TEXT[color] ?? "text-primary")}
            />
          </div>
        )}
      </div>

      {/* Title */}
      <p
        className={cn(
          "font-bold text-center text-sm leading-tight mb-0.5",
          isAnyUnlocked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {typeName}
      </p>

      {/* Milestone label */}
      <p
        className={cn(
          "text-xs text-center leading-tight",
          isAnyUnlocked
            ? (COLOR_TEXT[color] ?? "text-primary")
            : "text-muted-foreground/70"
        )}
      >
        {activeLabel}
      </p>

      {/* Progress bar (locked/in-progress only) */}
      {!isAnyUnlocked || nextMilestone ? (
        <div className="w-full mt-2">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isAnyUnlocked ? (COLOR_BG[color] ?? "bg-primary") : "bg-muted-foreground/40"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            {isAnyUnlocked
              ? t("achievements.progress", { current: currentProgress, target: nextMilestone?.target })
              : nextMilestone
                ? t("achievements.progress", { current: currentProgress, target: nextMilestone.target })
                : ""}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          {t("achievements.unlockedCount", { count: milestones.filter((m) => m.unlocked).length })}
        </p>
      )}

      {/* Hint tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border rounded-lg text-xs text-muted-foreground max-w-[180px] text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
        {hint}
      </div>
    </div>
  );
}

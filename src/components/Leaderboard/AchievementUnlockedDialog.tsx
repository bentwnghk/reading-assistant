"use client";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen, BookText, Layers, Network, FileEdit, FileMinus,
  Search, FileCheck, Target, PenTool, Brain, Sparkles, Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { useAchievementsStore } from "@/store/achievements";
import type { NewlyUnlockedAchievement } from "@/utils/activityLogger";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen, BookText, Layers, Network, FileEdit, FileMinus,
  Search, FileCheck, Target, PenTool, Brain, Sparkles,
};

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
  blue:   "shadow-blue-400/60",
  green:  "shadow-green-400/60",
  indigo: "shadow-indigo-400/60",
  purple: "shadow-purple-400/60",
  orange: "shadow-orange-400/60",
  teal:   "shadow-teal-400/60",
  pink:   "shadow-pink-400/60",
  red:    "shadow-red-400/60",
  cyan:   "shadow-cyan-400/60",
};

const COLOR_TEXT: Record<string, string> = {
  blue:   "text-blue-600 dark:text-blue-300",
  green:  "text-green-600 dark:text-green-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  purple: "text-purple-600 dark:text-purple-300",
  orange: "text-orange-600 dark:text-orange-300",
  teal:   "text-teal-600 dark:text-teal-300",
  pink:   "text-pink-600 dark:text-pink-300",
  red:    "text-red-600 dark:text-red-300",
  cyan:   "text-cyan-600 dark:text-cyan-300",
};

const COLOR_FROM: Record<string, string> = {
  blue:   "from-blue-500/10",
  green:  "from-green-500/10",
  indigo: "from-indigo-500/10",
  purple: "from-purple-500/10",
  orange: "from-orange-500/10",
  teal:   "from-teal-500/10",
  pink:   "from-pink-500/10",
  red:    "from-red-500/10",
  cyan:   "from-cyan-500/10",
};

interface MedalDisplayProps {
  achievement: NewlyUnlockedAchievement;
}

function MedalDisplay({ achievement }: MedalDisplayProps) {
  const { icon, color } = achievement;
  const IconComp = ICON_MAP[icon] ?? BookOpen;
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className={cn(
          "absolute w-32 h-32 rounded-full opacity-20 blur-2xl animate-pulse",
          COLOR_BG[color] ?? "bg-primary"
        )}
      />
      {/* Medal body */}
      <div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl",
          COLOR_BG[color] ?? "bg-primary",
          COLOR_GLOW[color] ?? ""
        )}
      >
        <IconComp className="w-12 h-12 text-white drop-shadow-lg" />
      </div>
      {/* Trophy badge */}
      <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full p-1.5 shadow-lg">
        <Trophy className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────
export function AchievementUnlockedDialog() {
  const { t } = useTranslation();
  const { showUnlockDialog, newlyUnlocked, pendingUnlocks, dismissUnlockDialog } = useAchievementsStore();
  const confettiFiredRef = useRef(false);

  const achievement = newlyUnlocked[0];

  useEffect(() => {
    if (!showUnlockDialog || !achievement) {
      confettiFiredRef.current = false;
      return;
    }
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    // Dynamic import to keep canvas-confetti out of the initial bundle
    import("canvas-confetti").then((module) => {
      const confetti = module.default;
      const colors = ["#facc15", "#f59e0b", "#fcd34d", "#fde68a"];

      // First burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.55 },
        colors,
        disableForReducedMotion: true,
      });

      // Second burst after delay
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 90,
          startVelocity: 28,
          origin: { y: 0.5 },
          colors: ["#a855f7", "#6366f1", "#22d3ee", "#10b981"],
          disableForReducedMotion: true,
        });
      }, 250);
    });
  }, [showUnlockDialog, achievement]);

  if (!achievement) return null;

  const typeName = t(`achievements.types.${achievement.type}.name`);
  const milestoneLabel = t(`achievements.types.${achievement.type}.description`, {
    count: achievement.milestone,
  });
  const hasMore = pendingUnlocks.length > 1;

  return (
    <Dialog open={showUnlockDialog} onOpenChange={(open) => { if (!open) dismissUnlockDialog(); }}>
      <DialogContent
        className={cn(
          "max-w-sm text-center overflow-hidden",
          "bg-gradient-to-b",
          COLOR_FROM[achievement.color] ?? "from-primary/10",
          "to-background"
        )}
      >
        {/* Decorative shimmer strip */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            COLOR_BG[achievement.color] ?? "bg-primary"
          )}
        />

        <div className="flex flex-col items-center gap-5 pt-6 pb-2">
          <MedalDisplay achievement={achievement} />

          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {t("achievements.congratulations")}
            </DialogTitle>
            <DialogDescription className="text-base font-semibold text-foreground/90">
              {typeName}
            </DialogDescription>
            <p className={cn("text-sm font-medium mt-1", COLOR_TEXT[achievement.color] ?? "text-primary")}>
              {milestoneLabel}
            </p>
          </div>

          <p className="text-sm text-muted-foreground max-w-[220px]">
            {t("achievements.keepGoing")}
          </p>

          <Button
            className={cn(
              "w-full text-white font-semibold",
              COLOR_BG[achievement.color] ?? "bg-primary",
              "hover:opacity-90"
            )}
            onClick={dismissUnlockDialog}
          >
            {hasMore
              ? t("leaderboard.rank.new") + ` (+${pendingUnlocks.length - 1} more)`
              : "🎉 " + t("achievements.unlocked")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

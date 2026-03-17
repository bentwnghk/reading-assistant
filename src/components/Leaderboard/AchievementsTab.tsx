"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { Medal, Loader2 } from "lucide-react";
import { cn } from "@/utils/style";
import { useAchievementsStore } from "@/store/achievements";
import { AchievementMedal } from "./AchievementMedal";

export function AchievementsTab() {
  const { t } = useTranslation();
  const { data: authSession } = useSession();
  const { achievements, totalUnlocked, totalMilestones, loading, fetchAchievements } =
    useAchievementsStore();

  useEffect(() => {
    if (authSession?.user?.id) {
      fetchAchievements();
    }
  }, [authSession?.user?.id, fetchAchievements]);

  const pct = totalMilestones > 0 ? Math.round((totalUnlocked / totalMilestones) * 100) : 0;

  if (loading && achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">{t("achievements.loading")}</p>
      </div>
    );
  }

  if (!authSession?.user?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Medal className="h-12 w-12 opacity-30" />
        <p className="text-sm">{t("achievements.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Overall progress banner ── */}
      <div className="rounded-xl border bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-orange-500/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Medal className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("achievements.title")}</p>
              <p className="text-xs text-muted-foreground">{t("achievements.subtitle")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400 tabular-nums">
              {totalUnlocked}
              <span className="text-sm font-normal text-muted-foreground">/{totalMilestones}</span>
            </p>
            <p className="text-xs text-muted-foreground">{pct}%</p>
          </div>
        </div>

        {/* Master progress bar */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("achievements.totalProgress", { unlocked: totalUnlocked, total: totalMilestones })}
        </p>
      </div>

      {/* ── Grid of medals ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {achievements.map((achievement) => (
          <AchievementMedal key={achievement.type} achievement={achievement} />
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary/40" />
          <span>{t("achievements.locked")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>{t("achievements.unlocked")}</span>
        </div>
        <div className={cn("flex items-center gap-1.5 ml-auto")}>
          <div className="flex gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  i < 2 ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <span>= {t("achievements.milestones")}</span>
        </div>
      </div>
    </div>
  );
}

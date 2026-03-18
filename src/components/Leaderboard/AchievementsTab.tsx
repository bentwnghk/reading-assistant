"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { Medal, Loader2 } from "lucide-react";
import { useAchievementsStore } from "@/store/achievements";
import { AchievementMedal } from "./AchievementMedal";

export function AchievementsTab() {
  const { t } = useTranslation();
  const { data: authSession } = useSession();
  const { achievements, totalUnlocked, loading, fetchAchievements } =
    useAchievementsStore();

  useEffect(() => {
    if (authSession?.user?.id) {
      fetchAchievements();
    }
  }, [authSession?.user?.id, fetchAchievements]);



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
            </p>
            <p className="text-xs text-muted-foreground">{t("achievements.milestonesEarned")}</p>
          </div>
        </div>
      </div>

      {/* ── Grid of medals ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {achievements.map((achievement) => (
          <AchievementMedal key={achievement.type} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

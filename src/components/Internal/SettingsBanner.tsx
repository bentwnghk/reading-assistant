"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/Internal/Button";
import { useSettingStore } from "@/store/setting";
import { useGlobalStore } from "@/store/global";
import useSubscription from "@/hooks/useSubscription";
import useSchoolSubscription from "@/hooks/useSchoolSubscription";
import { activateFreeTrial } from "@/utils/trial";

function SettingsBanner() {
  const { t } = useTranslation();
  const { data: sessionData } = useSession();
  const {
    openaicompatibleApiKey,
    accessPassword,
    freeAccessGranted,
    trialActive,
    trialEnabled,
    trialDays,
    trialUsed,
    authDataLoaded,
  } = useSettingStore();
  const { setOpenSetting } = useGlobalStore();
  const { subscription: personalSub, loading: personalLoading } = useSubscription();
  const { subscription: schoolSub, loading: schoolLoading } = useSchoolSubscription();
  const [isHydrated, setIsHydrated] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  useEffect(() => {
    const unsubHydrate = useSettingStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    if (useSettingStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }
    return unsubHydrate;
  }, []);

  if (!isHydrated) return null;
  if (personalLoading || schoolLoading) return null;
  // Wait for AuthProvider's sign-in sequence (incl. the free-access ticket)
  // to settle — otherwise whitelisted users get a "set up billing" flash.
  if (!authDataLoaded) return null;

  const hasActivePersonalSub = personalSub?.hasSubscription ?? false;
  const hasActiveSchoolSub = schoolSub?.hasSubscription ?? false;
  const hasActiveSub = hasActivePersonalSub || hasActiveSchoolSub;
  const hasCredentials = !!(
    openaicompatibleApiKey ||
    accessPassword ||
    freeAccessGranted ||
    trialActive
  );

  // Second-chance trial offer for users who dismissed the onboarding wizard:
  // feature enabled on this deployment and this user hasn't consumed their
  // one-time trial yet.
  const trialEligible =
    trialEnabled && trialDays > 0 && !trialUsed && !trialActive;

  async function handleStartTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    try {
      const result = await activateFreeTrial(sessionData?.user?.role);
      if (!result.ok) {
        toast.error(
          t(
            result.reason === "used"
              ? "onboarding.trial.alreadyUsed"
              : result.reason === "disabled"
                ? "onboarding.trial.notEnabled"
                : "onboarding.trial.startFailed"
          )
        );
        return;
      }
      toast.success(t("onboarding.trial.started"));
    } finally {
      setStartingTrial(false);
    }
  }

  if (hasActiveSub || hasCredentials) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400 dark:border-amber-600 px-4 py-3 -mx-4 mb-4 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("settingsBanner.message")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trialEligible && (
            <Button
              size="sm"
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="border-violet-500 dark:border-violet-600 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
              variant="outline"
            >
              {startingTrial ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hourglass className="h-4 w-4" />
              )}
              {t("settingsBanner.startTrial", { days: trialDays })}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800"
            onClick={() => setOpenSetting(true)}
          >
            {t("settingsBanner.openSettings")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsBanner;

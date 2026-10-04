"use client";

import { useSettingStore } from "@/store/setting";
import useSubscription from "@/hooks/useSubscription";
import useSchoolSubscription from "@/hooks/useSchoolSubscription";

/**
 * Whether the signed-in user has any AI access path: personal/school
 * subscription, meter-billing API key, Access Password, identity-bound free
 * access (FREE_ACCESS_EMAILS), or an active onboarding free trial.
 *
 * Used to gate features that cannot function without AI — the multiplayer
 * spelling battle lobby (hosting needs a word source + TTS, and listen-type
 * words are revealed only via TTS, which rides the gated AI proxies).
 */
export default function useAiAccess() {
  const {
    openaicompatibleApiKey,
    accessPassword,
    freeAccessGranted,
    trialActive,
    authDataLoaded,
  } = useSettingStore();
  const { subscription: personalSub, loading: personalLoading } =
    useSubscription();
  const { subscription: schoolSub, loading: schoolLoading } =
    useSchoolSubscription();

  const hasAiAccess =
    (personalSub?.hasSubscription ?? false) ||
    (schoolSub?.hasSubscription ?? false) ||
    !!openaicompatibleApiKey ||
    !!accessPassword ||
    freeAccessGranted ||
    trialActive;

  /** False while the sign-in data is still settling (boot) — access unknown. */
  const accessKnown = authDataLoaded && !personalLoading && !schoolLoading;

  return { hasAiAccess, accessKnown };
}

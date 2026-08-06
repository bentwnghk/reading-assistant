"use client";
import { useLayoutEffect, useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import i18n, { resolveLanguagePreference } from "@/utils/i18n";

function I18Provider({ children }: { children: React.ReactNode }) {
  const { language } = useSettingStore();
  const isHydrated = useRef(false);

  useLayoutEffect(() => {
    // iOS Safari can transiently reject localStorage/sessionStorage access while
    // the security origin re-initializes after a tab is killed and restored.
    // `resolveLanguagePreference` → `detectLanguage()` also reads storage/navigator
    // internally, so guard the whole resolution so a restore can't crash the page.
    let resolvedLanguage: string;
    try {
      let effectiveLanguage: string;
      if (!isHydrated.current) {
        isHydrated.current = true;
        let storedLanguage: string | null = null;
        try {
          storedLanguage = localStorage.getItem("language");
        } catch {}
        effectiveLanguage = storedLanguage ?? language;
      } else {
        effectiveLanguage = language;
      }
      resolvedLanguage = resolveLanguagePreference(effectiveLanguage);
    } catch {
      resolvedLanguage = "en-US";
    }
    try {
      i18n.changeLanguage(resolvedLanguage);
      document.documentElement.setAttribute("lang", resolvedLanguage);
      document.title = i18n.t("title");
    } catch {}
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default I18Provider;

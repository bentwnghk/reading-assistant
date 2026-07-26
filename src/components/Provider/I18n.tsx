"use client";
import { useLayoutEffect, useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import i18n, { resolveLanguagePreference } from "@/utils/i18n";

function I18Provider({ children }: { children: React.ReactNode }) {
  const { language } = useSettingStore();
  const isHydrated = useRef(false);

  useLayoutEffect(() => {
    let effectiveLanguage: string;
    if (!isHydrated.current) {
      isHydrated.current = true;
      const storedLanguage = localStorage.getItem("language");
      effectiveLanguage = storedLanguage ?? language;
    } else {
      effectiveLanguage = language;
    }
    const resolvedLanguage = resolveLanguagePreference(effectiveLanguage);
    i18n.changeLanguage(resolvedLanguage);
    document.documentElement.setAttribute("lang", resolvedLanguage);
    document.title = i18n.t("title");
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default I18Provider;

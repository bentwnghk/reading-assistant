"use client";
import { useLayoutEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import i18n, { detectLanguage } from "@/utils/i18n";

function I18Provider({ children }: { children: React.ReactNode }) {
  const { language } = useSettingStore();

  useLayoutEffect(() => {
    if (language === "system" || language === "") {
      const browserLang = detectLanguage();
      i18n.changeLanguage(browserLang);
      document.documentElement.setAttribute("lang", browserLang);
    } else {
      i18n.changeLanguage(language);
      document.documentElement.setAttribute("lang", language);
    }
    document.title = i18n.t("title");
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default I18Provider;

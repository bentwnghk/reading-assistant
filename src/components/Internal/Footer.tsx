"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t, i18n } = useTranslation();
  const manualUrl = i18n.language === "zh-HK" ? "/docs/user-manual-zh-hk.html" : "/docs/user-manual-en.html";
  return (
    <footer className="border-t border-[var(--lp-rule)]">
      <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-[var(--lp-ink-soft)]">
        <p className="mb-3">
          {t("header.about.builtWith")}
          {t("header.about.builtWithPoweredByPrefix")}
          <a
            href="https://api.mr5ai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--lp-ink)]"
          >
            Mr.🆖 AI Hub
          </a>
          {t("header.about.builtWithPoweredBySuffix")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/terms-of-service" className="transition-colors hover:text-[var(--lp-ink)]">
            {t("termsOfService")}
          </Link>
          <span>·</span>
          <Link href="/privacy-policy" className="transition-colors hover:text-[var(--lp-ink)]">
            {t("privacyPolicy")}
          </Link>
          <span>·</span>
          <a href={manualUrl} className="transition-colors hover:text-[var(--lp-ink)]" target="_blank" rel="noopener noreferrer">
            {t("userManual")}
          </a>
        </div>
      </div>
    </footer>
  );
}

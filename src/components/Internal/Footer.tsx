"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
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
        </div>
      </div>
    </footer>
  );
}

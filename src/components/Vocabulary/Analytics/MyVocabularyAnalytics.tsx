"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LearnRangeTabs from "@/components/LanguageCheck/Learn/LearnRangeTabs";
import useLanguageCheckLearnData, { browserTimeZone } from "@/hooks/useLanguageCheckLearnData";
import VocabularyDashboardView from "./VocabularyDashboardView";
import type { VocabularyAnalyticsData } from "@/utils/vocabularyAnalyticsWire";

/**
 * The signed-in learner's own analytics on /vocabulary: the staff Overview tab
 * minus the class/student filters and the per-student table — every figure is
 * scoped to that learner by the /api/vocabulary/analytics/me endpoint.
 */
export default function MyVocabularyAnalytics() {
  const { t } = useTranslation();
  const [range, setRange] = useState(30);
  const { data, loading, error, reload } = useLanguageCheckLearnData<VocabularyAnalyticsData>(
    `/api/vocabulary/analytics/me?${new URLSearchParams({
      range: String(range),
      tz: browserTimeZone(),
    })}`,
  );

  if (!data) {
    return loading ? (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ) : (
      <div className="space-y-2 py-6 text-center text-sm text-red-600">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          {t("languageCheck.staff.refresh")}
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LearnRangeTabs value={range} onChange={setRange} />
      </div>
      <div className={loading ? "opacity-60" : undefined}>
        <VocabularyDashboardView data={data} variant="self" />
      </div>
    </section>
  );
}

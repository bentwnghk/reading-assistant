"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function SummarySkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function Summary() {
  const { t } = useTranslation();
  const { extractedText, summary } = useReadingStore();
  const { status, generateSummary } = useReadingAssistant();
  const isGenerating = status === "summarizing";

  if (!extractedText) {
    return null;
  }

  return (
    <section className="section-card section-header-accent mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
          {t("reading.summary.title")}
        </h3>
        {!summary && (
          <Button
            onClick={() => generateSummary()}
            disabled={isGenerating}
            size="sm"
            className="transition-transform active:scale-95"
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.summary.generating")}</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>{t("reading.summary.generate")}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating ? (
        <div className="space-y-4">
          <SummarySkeleton />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span className="loading-dots">{t("reading.summary.analyzing")}</span>
          </div>
        </div>
      ) : summary ? (
        <div className="prose prose-slate dark:prose-invert max-w-full animate-fade-in-up">
          <MagicDown
            value={summary}
            onChange={() => {}}
            hideTools
            disableMath
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.summary.emptyTip")}</p>
        </div>
      )}
    </section>
  );
}

export default Summary;

"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function Summary() {
  const { t } = useTranslation();
  const { extractedText, summary } = useReadingStore();
  const { status, generateSummary } = useReadingAssistant();
  const isGenerating = status === "summarizing";

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
          {t("reading.summary.title")}
        </h3>
        {!summary && (
          <Button
            onClick={() => generateSummary()}
            disabled={isGenerating}
            size="sm"
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

      {summary ? (
        <div className="prose prose-slate dark:prose-invert max-w-full">
          <MagicDown
            value={summary}
            onChange={() => {}}
            hideTools
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t("reading.summary.emptyTip")}</p>
        </div>
      )}
    </section>
  );
}

export default Summary;

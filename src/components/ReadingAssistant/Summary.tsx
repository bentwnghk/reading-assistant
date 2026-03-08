"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { FileText, LoaderCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          {t("reading.summary.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[400px]" align="start">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-base">{t("reading.summary.help.title")}</h4>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("reading.summary.help.purpose")}</p>
                  <p className="text-muted-foreground">{t("reading.summary.help.features")}</p>
                  <p className="text-muted-foreground">{t("reading.summary.help.usage")}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <Button
          onClick={() => generateSummary()}
          disabled={isGenerating}
          size="sm"
          variant={summary ? "secondary" : "default"}
        >
          {isGenerating ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>{t("reading.summary.generating")}</span>
            </>
          ) : summary ? (
            <>
              <FileText className="h-4 w-4" />
              <span>{t("reading.summary.regenerate")}</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>{t("reading.summary.generate")}</span>
            </>
          )}
        </Button>
      </div>

      {summary ? (
        <div className="prose prose-slate dark:prose-invert max-w-full 
          prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-base prose-headings:font-semibold
          prose-p:my-2 prose-p:leading-relaxed
          prose-li:my-1 prose-li:leading-relaxed
          prose-ul:my-2 prose-ol:my-2
          prose-strong:text-foreground prose-strong:font-semibold
          prose-hr:my-4
          text-[15px]">
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

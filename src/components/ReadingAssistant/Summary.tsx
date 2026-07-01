"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { FileText, LoaderCircle, ListChecks, BookMarked, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function Summary() {
  const { t } = useTranslation();
  const { extractedText, summary } = useReadingStore();
  const { activeGenerations, generateSummary } = useReadingAssistant();
  const isGenerating = !!activeGenerations["summary"];

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          {t("reading.summary.title")}
          <GuideDialog
            titleKey="reading.summary.help.title"
            introKey="reading.summary.help.intro"
            itemsBaseKey="reading.summary.help.items"
            items={[
              { key: "tldr", icon: Lightbulb, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "mainPoints", icon: ListChecks, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
              { key: "keyWords", icon: BookMarked, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
              { key: "reflect", icon: FileText, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
            ]}
            stepsTitleKey="reading.summary.help.stepsTitle"
            stepsKeys={[
              "reading.summary.help.steps.s1",
              "reading.summary.help.steps.s2",
              "reading.summary.help.steps.s3",
              "reading.summary.help.steps.s4",
            ]}
            tipTitleKey="reading.summary.help.tipTitle"
            tipContentKey="reading.summary.help.tipContent"
          />
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

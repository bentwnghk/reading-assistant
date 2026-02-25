"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonMindMap } from "@/components/ui/skeleton";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown/View"));

function MindMap() {
  const { t } = useTranslation();
  const { extractedText, mindMap } = useReadingStore();
  const { status, generateMindMap } = useReadingAssistant();
  const isGenerating = status === "mindmap";

  if (!extractedText) {
    return null;
  }

  return (
    <section className="section-card section-header-accent mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
          {t("reading.mindMap.title")}
        </h3>
        <Button
          onClick={() => generateMindMap()}
          disabled={isGenerating}
          size="sm"
          variant={mindMap ? "secondary" : "default"}
          className="transition-transform active:scale-95"
        >
          {isGenerating ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>{t("reading.mindMap.generating")}</span>
            </>
          ) : mindMap ? (
            <>
              <Waypoints className="h-4 w-4" />
              <span>{t("reading.mindMap.regenerate")}</span>
            </>
          ) : (
            <>
              <Waypoints className="h-4 w-4" />
              <span>{t("reading.mindMap.generate")}</span>
            </>
          )}
        </Button>
      </div>

      {isGenerating ? (
        <div className="space-y-4">
          <SkeletonMindMap />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span className="loading-dots">{t("reading.mindMap.creating")}</span>
          </div>
        </div>
      ) : mindMap ? (
        <div className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto animate-fade-in-up">
          <MagicDown>{mindMap}</MagicDown>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Waypoints className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.mindMap.emptyTip")}</p>
        </div>
      )}
    </section>
  );
}

export default MindMap;

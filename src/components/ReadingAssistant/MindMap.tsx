"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-muted-foreground" />
          {t("reading.mindMap.title")}
        </h3>
        <Button
          onClick={() => generateMindMap()}
          disabled={isGenerating}
          size="sm"
          variant={mindMap ? "secondary" : "default"}
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

      {mindMap ? (
        <div className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto">
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

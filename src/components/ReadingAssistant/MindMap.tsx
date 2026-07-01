"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle, Languages, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown/View"));

function MindMap() {
  const { t } = useTranslation();
  const { extractedText, mindMap } = useReadingStore();
  const { activeGenerations, generateMindMap } = useReadingAssistant();
  const isGenerating = !!activeGenerations["mindmap"];
  const [useChinese, setUseChinese] = useState(false);

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-muted-foreground" />
          {t("reading.mindMap.title")}
          <GuideDialog
            titleKey="reading.mindMap.help.title"
            introKey="reading.mindMap.help.intro"
            itemsBaseKey="reading.mindMap.help.items"
            items={[
              { key: "structure", icon: Network, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "bilingual", icon: Languages, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
            ]}
            stepsTitleKey="reading.mindMap.help.stepsTitle"
            stepsKeys={[
              "reading.mindMap.help.steps.s1",
              "reading.mindMap.help.steps.s2",
              "reading.mindMap.help.steps.s3",
            ]}
            tipTitleKey="reading.mindMap.help.tipTitle"
            tipContentKey="reading.mindMap.help.tipContent"
          />
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={useChinese}
              onCheckedChange={setUseChinese}
              disabled={isGenerating}
            />
            <span className="text-sm text-muted-foreground">
              {t("reading.mindMap.chineseLabel")}
            </span>
          </div>
          <Button
            onClick={() => generateMindMap(useChinese)}
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

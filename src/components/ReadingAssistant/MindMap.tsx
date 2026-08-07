"use client";
import dynamic from "next/dynamic";
import { useState, useRef, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle, Languages, Network, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { downloadFile } from "@/utils/file";
import MindMapView from "./MindMapView";

const MagicDown = dynamic(() => import("@/components/MagicDown/View"));

/** New mind maps are stored as JSON (`MindMapData`); legacy sessions stored a
 *  Mermaid markdown string. Detect which one this is so legacy data still
 *  renders via Mermaid while new generations render as the left-to-right tree. */
function tryParseMindMapData(raw: string): MindMapData | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Legacy Mermaid markdown starts with a code fence or a diagram keyword.
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (
      obj &&
      typeof obj.root === "string" &&
      Array.isArray(obj.branches) &&
      obj.branches.length > 0
    ) {
      return obj as MindMapData;
    }
  } catch {
    // Not valid JSON — fall through to Mermaid rendering.
  }
  return null;
}

function MindMap() {
  const { t } = useTranslation();
  const { extractedText, mindMap, docTitle } = useReadingStore();
  const { activeGenerations, generateMindMap } = useReadingAssistant();
  const isGenerating = !!activeGenerations["mindmap"];
  const [useChinese, setUseChinese] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  if (!extractedText) {
    return null;
  }

  function handleDownload() {
    const svg = sectionRef.current?.querySelector("svg");
    if (!svg) return;
    const safeFileName = (docTitle || "Untitled")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const source = new XMLSerializer().serializeToString(svg);
    downloadFile(source, `${safeFileName} - Mind Map.svg`, "image/svg+xml");
  }

  return (
    <section className="p-4 border rounded-md mt-4" ref={sectionRef}>
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
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
        <div className="flex items-center gap-2 ml-auto">
          {mindMap && (
            <Button
              onClick={handleDownload}
              size="sm"
              variant="ghost"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("reading.mindMap.download")}
            </Button>
          )}
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
        (() => {
          const parsed = tryParseMindMapData(mindMap);
          if (parsed) {
            return (
              <div className="max-w-full overflow-x-auto rounded-md bg-muted/30 p-2 dark:bg-muted/20">
                <MindMapView data={parsed} />
              </div>
            );
          }
          // Legacy: stored as Mermaid markdown.
          return (
            <div className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto">
              <Suspense fallback={null}>
                <MagicDown hideMermaidDownload>{mindMap}</MagicDown>
              </Suspense>
            </div>
          );
        })()
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

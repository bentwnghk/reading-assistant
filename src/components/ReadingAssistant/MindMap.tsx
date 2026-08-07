"use client";
import dynamic from "next/dynamic";
import { useState, useRef, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle, Languages, Network, Download } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
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
    // Rasterize the SVG to a PNG via a canvas. The SVG is cloned with an
    // explicit pixel size + namespaces so the Image loads it standalone.
    const clone = svg.cloneNode(true) as SVGSVGElement;
    let w = parseFloat(clone.getAttribute("width") ?? "");
    let h = parseFloat(clone.getAttribute("height") ?? "");
    if (!w || !h) {
      const vb = (clone.getAttribute("viewBox") ?? "")
        .split(/[\s,]+/)
        .map(Number);
      if (vb.length === 4 && vb[2] && vb[3]) {
        w = vb[2];
        h = vb[3];
      }
    }
    if (!w || !h) {
      toast.error(t("reading.mindMap.downloadError"));
      return;
    }
    const SCALE = 2;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * SCALE);
      canvas.height = Math.round(h * SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error(t("reading.mindMap.downloadError"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error(t("reading.mindMap.downloadError"));
          return;
        }
        saveAs(blob, `${safeFileName} - Mind Map.png`);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(t("reading.mindMap.downloadError"));
    };
    img.src = url;
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
              <div className="overflow-hidden rounded-md border">
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

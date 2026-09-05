"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { ImageIcon, LoaderCircle, Download, ZoomIn, X, Lock, Wand2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { generateSignature } from "@/utils/signature";

function Visualization() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "student";
  const isRateLimitedRole = userRole === "student" || userRole === "teacher";
  const { mode, accessPassword } = useSettingStore();
  const isMeterMode = mode === "local";
  const { extractedText, visualizationImage, docTitle } = useReadingStore();
  const { activeGenerations, generateVisualization } = useReadingAssistant();
  const isGenerating = !!activeGenerations["visualization"];
  const [zoomed, setZoomed] = useState(false);
  const [useChinese, setUseChinese] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const isLimitReached = !isMeterMode && isRateLimitedRole && remaining !== null && remaining <= 0;
  const showLimit = !isMeterMode && isRateLimitedRole && remaining !== null;

  const fetchRemaining = useCallback(async () => {
    if (!session?.user?.id || isMeterMode || !isRateLimitedRole) return;
    try {
      const headers: Record<string, string> = {};
      if (mode === "proxy") {
        headers["x-access-signature"] = generateSignature(accessPassword, Date.now());
      }
      const res = await fetch(`/api/ai/visualization?mode=${mode}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining);
      }
    } catch {}
  }, [session?.user?.id, isMeterMode, isRateLimitedRole, mode, accessPassword]);

  useEffect(() => {
    fetchRemaining();
  }, [fetchRemaining]);

  if (!extractedText) {
    return null;
  }

  async function handleGenerate() {
    const result = await generateVisualization(useChinese);
    if (result !== null) {
      setRemaining(result);
    } else {
      fetchRemaining();
    }
  }

  function handleDownload() {
    if (!visualizationImage) return;
    const link = document.createElement("a");
    link.href = visualizationImage;
    const safeFileName = (docTitle || "Untitled")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    link.download = `${safeFileName} - Visualization.png`;
    link.click();
  }

  const canGenerateControls = !isLimitReached;

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          {t("reading.visualization.title")}
          <GuideDialog
            titleKey="reading.visualization.help.title"
            introKey="reading.visualization.help.intro"
            itemsBaseKey="reading.visualization.help.items"
            items={[
              { key: "style", icon: Wand2, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "zoom", icon: ZoomIn, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
              { key: "bilingual", icon: Languages, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
            ]}
            stepsTitleKey="reading.visualization.help.stepsTitle"
            stepsKeys={[
              "reading.visualization.help.steps.s1",
              "reading.visualization.help.steps.s2",
              "reading.visualization.help.steps.s3",
            ]}
            tipTitleKey="reading.visualization.help.tipTitle"
            tipContentKey="reading.visualization.help.tipContent"
          />
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          {visualizationImage && (
            <Button
              onClick={handleDownload}
              size="sm"
              variant="ghost"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("reading.visualization.download")}
            </Button>
          )}
          {canGenerateControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={useChinese}
                onCheckedChange={setUseChinese}
                disabled={isGenerating}
              />
              <span className="text-sm text-muted-foreground">
                {t("reading.visualization.chineseLabel")}
              </span>
            </div>
          )}
          {canGenerateControls && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="sm"
              variant={visualizationImage ? "secondary" : "default"}
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                  {t("reading.visualization.generating")}
                </>
              ) : visualizationImage ? (
                <>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {t("reading.visualization.regenerate")}
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {t("reading.visualization.generate")}
                </>
              )}
            </Button>
          )}
          {showLimit && (
            <span className="text-xs text-muted-foreground">
              {t("reading.visualization.remaining", { count: remaining })}
            </span>
          )}
        </div>
      </div>

      {visualizationImage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="relative group cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visualizationImage}
              alt={t("reading.visualization.title")}
              className="max-w-full h-auto rounded-md border shadow-sm"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
            </div>
          </button>
        </div>
      ) : isLimitReached ? (
        <div className="text-center py-8">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium mb-1">{t("reading.visualization.limitReachedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("reading.visualization.limitReachedTip")}</p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.visualization.emptyTip")}</p>
        </div>
      )}

      {zoomed && visualizationImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setZoomed(false)}
          >
            <X className="h-8 w-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visualizationImage}
            alt={t("reading.visualization.title")}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

export default Visualization;

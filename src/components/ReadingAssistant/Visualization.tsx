"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { ImageIcon, LoaderCircle, HelpCircle, Download, ZoomIn, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

function Visualization() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "student";
  const isStudent = userRole === "student";
  const { extractedText, visualizationImage, docTitle } = useReadingStore();
  const { status, generateVisualization } = useReadingAssistant();
  const isGenerating = status === "visualization";
  const [zoomed, setZoomed] = useState(false);
  const [useChinese, setUseChinese] = useState(false);

  if (!extractedText) {
    return null;
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

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          {t("reading.visualization.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[380px]" align="start">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-base">{t("reading.visualization.help.title")}</h4>
                <p className="text-muted-foreground">{t("reading.visualization.help.purpose")}</p>
                <div className="space-y-2">
                  <h5 className="font-medium">{t("reading.visualization.help.featuresTitle")}</h5>
                  <p className="text-muted-foreground">{t("reading.visualization.help.features")}</p>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">{t("reading.visualization.help.usageTitle")}</h5>
                  <p className="text-muted-foreground">{t("reading.visualization.help.usage")}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <div className="flex items-center gap-2">
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
          {!(isStudent && visualizationImage) && (
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
          {!(isStudent && visualizationImage) && (
            <Button
              onClick={() => generateVisualization(useChinese)}
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
        </div>
      </div>

      {visualizationImage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="relative group cursor-pointer"
          >
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

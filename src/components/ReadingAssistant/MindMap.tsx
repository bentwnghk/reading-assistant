"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown/View"));

function MindMap() {
  const { t } = useTranslation();
  const { extractedText, mindMap } = useReadingStore();
  const { status, generateMindMap } = useReadingAssistant();
  const isGenerating = status === "mindmap";
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!extractedText) {
    return null;
  }

  return (
    <>
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b mb-4">
          <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
            <Waypoints className="h-5 w-5 text-muted-foreground" />
            {t("reading.mindMap.title")}
          </h3>
          <div className="flex items-center gap-2">
            {mindMap && (
              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                variant="ghost"
                title={t("reading.mindMap.expand")}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
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
        </div>

        {mindMap ? (
          <div className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto min-h-[300px]">
            <MagicDown>{mindMap}</MagicDown>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Waypoints className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("reading.mindMap.emptyTip")}</p>
          </div>
        )}
      </section>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Waypoints className="h-5 w-5 text-muted-foreground" />
              {t("reading.mindMap.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto prose prose-slate dark:prose-invert max-w-none">
            {mindMap && <MagicDown>{mindMap}</MagicDown>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MindMap;

"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";

interface ScanViewerProps {
  images: string[];
  className?: string;
}

/** Original scanned pages with page navigation and zoom/pan. */
export default function ScanViewer({ images, className }: ScanViewerProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const index = Math.min(page, Math.max(0, images.length - 1));

  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/40",
        className,
      )}
    >
      {/* key resets zoom/pan when the page changes */}
      <TransformWrapper
        key={index}
        initialScale={1}
        minScale={0.5}
        maxScale={6}
        centerOnInit
        smooth
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex items-center justify-between gap-2 border-b bg-background/80 px-2 py-1.5">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => setPage(index - 1)}
                  title={t("languageCheck.review.prevPage")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
                  {t("languageCheck.review.page", {
                    current: index + 1,
                    total: images.length,
                  })}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index >= images.length - 1}
                  onClick={() => setPage(index + 1)}
                  title={t("languageCheck.review.nextPage")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => zoomOut()}
                  title={t("languageCheck.review.zoomOut")}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => zoomIn()}
                  title={t("languageCheck.review.zoomIn")}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => resetTransform()}
                  title={t("languageCheck.review.resetZoom")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[index]}
                  alt={t("languageCheck.review.pageAlt", { page: index + 1 })}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

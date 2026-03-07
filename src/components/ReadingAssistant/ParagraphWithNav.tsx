"use client";
import { useRef, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

type TabType = "original" | "adapted" | "simplified";

interface ParagraphWithNavProps {
  text: string;
  currentTab: TabType;
  onNavigate: (targetTab: TabType, paragraphIndex: number) => void;
  paragraphCounts: {
    original: number;
    adapted: number;
    simplified: number;
  };
  hasAdaptedText: boolean;
  hasSimplifiedText: boolean;
  highlightHtml?: string;
}

const TAB_CONFIG: Record<
  TabType,
  { label: string; targetKey: keyof ParagraphWithNavProps["paragraphCounts"] }
> = {
  original: { label: "O", targetKey: "original" },
  adapted: { label: "A", targetKey: "adapted" },
  simplified: { label: "S", targetKey: "simplified" },
};

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function ParagraphWithNav({
  text,
  currentTab,
  onNavigate,
  paragraphCounts,
  hasAdaptedText,
  hasSimplifiedText,
  highlightHtml,
}: ParagraphWithNavProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const paragraphs = splitIntoParagraphs(text);

  const getNavTargets = useCallback((): TabType[] => {
    switch (currentTab) {
      case "original":
        return ["adapted", "simplified"];
      case "adapted":
        return ["original", "simplified"];
      case "simplified":
        return ["original", "adapted"];
    }
  }, [currentTab]);

  const isTargetAvailable = useCallback(
    (targetTab: TabType): boolean => {
      switch (targetTab) {
        case "adapted":
          return hasAdaptedText;
        case "simplified":
          return hasSimplifiedText;
        case "original":
          return true;
      }
    },
    [hasAdaptedText, hasSimplifiedText]
  );

  const hasParagraphMismatch = useCallback(
    (targetTab: TabType, currentIndex: number): boolean => {
      const targetKey = TAB_CONFIG[targetTab].targetKey;
      const targetCount = paragraphCounts[targetKey];
      return currentIndex >= targetCount;
    },
    [paragraphCounts]
  );

  const getTooltipKey = (targetTab: TabType): string => {
    switch (targetTab) {
      case "original":
        return "reading.adaptedText.goToOriginal";
      case "adapted":
        return "reading.adaptedText.goToAdapted";
      case "simplified":
        return "reading.adaptedText.goToSimplified";
    }
  };

  const renderNavButtons = (paragraphIndex: number) => {
    const targets = getNavTargets();

    return (
      <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
        {targets.map((targetTab) => {
          const isAvailable = isTargetAvailable(targetTab);
          const hasMismatch = hasParagraphMismatch(targetTab, paragraphIndex);

          if (!isAvailable) return null;

          return (
            <Tooltip key={targetTab}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs font-medium rounded-sm hover:bg-primary/10 dark:hover:bg-primary/20"
                  onClick={() => onNavigate(targetTab, paragraphIndex)}
                  disabled={!isAvailable}
                >
                  {TAB_CONFIG[targetTab].label}
                  {hasMismatch && (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{t(getTooltipKey(targetTab))}</p>
                {hasMismatch && (
                  <p className="text-amber-500 text-xs mt-0.5">
                    {t("reading.adaptedText.paragraphMismatch")}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    );
  };

  const renderParagraph = (paragraph: string, index: number) => {
    const isOriginalWithHighlight = currentTab === "original" && highlightHtml;
    
    if (isOriginalWithHighlight) {
      const allParagraphs = splitIntoParagraphs(highlightHtml!);
      const htmlParagraph = allParagraphs[index] || paragraph;
      
      return (
        <div
          key={index}
          data-paragraph-index={index}
          className="paragraph-wrapper mb-4"
        >
          <span className="inline">
            <MagicDown value={htmlParagraph} onChange={() => {}} hideTools disableMath />
          </span>
          {renderNavButtons(index)}
        </div>
      );
    }

    return (
      <div
        key={index}
        data-paragraph-index={index}
        className="paragraph-wrapper mb-4"
      >
        <span className="inline">
          <MagicDown value={paragraph} onChange={() => {}} hideTools disableMath />
        </span>
        {renderNavButtons(index)}
      </div>
    );
  };

  if (paragraphs.length === 0) {
    return (
      <div ref={containerRef}>
        <MagicDown value={text} onChange={() => {}} hideTools disableMath />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div ref={containerRef}>{paragraphs.map(renderParagraph)}</div>
    </TooltipProvider>
  );
}

export default memo(ParagraphWithNav);

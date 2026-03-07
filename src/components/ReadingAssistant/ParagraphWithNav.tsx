"use client";
import { useRef, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { clsx } from "clsx";

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
      <span className="inline-flex items-center gap-0.5 ml-1.5 align-baseline shrink-0">
        {targets.map((targetTab) => {
          const isAvailable = isTargetAvailable(targetTab);
          const hasMismatch = hasParagraphMismatch(targetTab, paragraphIndex);

          if (!isAvailable) return null;

          return (
            <Tooltip key={targetTab}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={clsx(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded",
                    "border border-muted-foreground/30 bg-background/80 hover:bg-muted/50",
                    "transition-colors duration-150",
                    "dark:border-muted-foreground/40 dark:bg-background/90"
                  )}
                  onClick={() => onNavigate(targetTab, paragraphIndex)}
                >
                  {TAB_CONFIG[targetTab].label}
                  {hasMismatch && (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
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
          className="mb-4 leading-relaxed"
        >
          <span className="inline">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeRaw]}
              components={{
                p: ({ children }) => (
                  <span className="inline">
                    {children}
                    {renderNavButtons(index)}
                  </span>
                ),
              }}
            >
              {htmlParagraph}
            </ReactMarkdown>
          </span>
        </div>
      );
    }

    return (
      <div
        key={index}
        data-paragraph-index={index}
        className="mb-4 leading-relaxed"
      >
        <span className="inline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({ children }) => (
                <span className="inline">
                  {children}
                  {renderNavButtons(index)}
                </span>
              ),
            }}
          >
            {paragraph}
          </ReactMarkdown>
        </span>
      </div>
    );
  };

  if (paragraphs.length === 0) {
    return (
      <div
        ref={containerRef}
        className="prose prose-slate dark:prose-invert max-w-full"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="prose prose-slate dark:prose-invert max-w-full"
      >
        {paragraphs.map(renderParagraph)}
      </div>
    </TooltipProvider>
  );
}

export default memo(ParagraphWithNav);

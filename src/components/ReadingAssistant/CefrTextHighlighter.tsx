"use client";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Highlighter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCefrWordHighlights,
  getCefrHighlightColor,
  CefrHighlightResult,
} from "@/utils/textDifficulty";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LEVEL_COLORS: Record<CEFRLevel, { bg: string; dot: string }> = {
  A1: { bg: "bg-cyan-200 dark:bg-cyan-800", dot: "bg-cyan-500" },
  A2: { bg: "bg-green-200 dark:bg-green-800", dot: "bg-green-500" },
  B1: { bg: "bg-amber-200 dark:bg-amber-800", dot: "bg-amber-500" },
  B2: { bg: "bg-orange-200 dark:bg-orange-800", dot: "bg-orange-500" },
  C1: { bg: "bg-red-200 dark:bg-red-800", dot: "bg-red-500" },
  C2: { bg: "bg-purple-200 dark:bg-purple-800", dot: "bg-purple-500" },
};

interface HighlightedTextProps {
  text: string;
  cefrResult: CefrHighlightResult | null;
  selectedLevels: CEFRLevel[];
}

function HighlightedText({ text, cefrResult, selectedLevels }: HighlightedTextProps) {
  const highlightedContent = useMemo(() => {
    if (!cefrResult) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    const wordPattern = /\b([a-zA-Z]+)\b/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = wordPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{text.slice(lastIndex, match.index)}</span>
        );
      }

      const word = match[1];
      const lowerWord = word.toLowerCase();
      const level = cefrResult.wordMap.get(lowerWord);

      if (level && selectedLevels.includes(level)) {
        const colorClass = getCefrHighlightColor(level);
        parts.push(
          <span
            key={`word-${key++}`}
            className={`${colorClass} px-0.5 rounded cursor-default`}
            title={`CEFR: ${level}`}
          >
            {word}
          </span>
        );
      } else {
        parts.push(<span key={`word-${key++}`}>{word}</span>);
      }

      lastIndex = match.index + word.length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  }, [text, cefrResult, selectedLevels]);

  return <>{highlightedContent}</>;
}

interface CefrTextHighlighterProps {
  text: string | null;
  showHighlighter: boolean;
  onToggle: () => void;
}

export default function CefrTextHighlighter({
  text,
  showHighlighter,
  onToggle,
}: CefrTextHighlighterProps) {
  const { t } = useTranslation();
  const [selectedLevels, setSelectedLevels] = useState<CEFRLevel[]>(CEFR_LEVELS);

  const toggleLevel = (level: CEFRLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const cefrResult = useMemo(() => {
    if (!showHighlighter || !text) return null;
    return getCefrWordHighlights(text);
  }, [showHighlighter, text]);

  if (!text) return null;

  return (
    <div className="mt-4 border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Highlighter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {t("reading.difficulty.cefrHighlight")}
          </span>
        </div>
        <Button
          onClick={onToggle}
          size="sm"
          variant={showHighlighter ? "default" : "outline"}
        >
          {showHighlighter ? (
            <>
              <X className="h-3 w-3 mr-1" />
              {t("reading.difficulty.hideHighlight")}
            </>
          ) : (
            <>
              <Highlighter className="h-3 w-3 mr-1" />
              {t("reading.difficulty.showHighlight")}
            </>
          )}
        </Button>
      </div>

      {showHighlighter && (
        <>
          <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
            {CEFR_LEVELS.map((level) => {
              const count = cefrResult?.distribution[level] || 0;
              const isSelected = selectedLevels.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "opacity-100 hover:scale-105"
                      : "opacity-40 hover:opacity-60"
                  }`}
                  title={isSelected ? t("reading.difficulty.clickToHideWords", { level }) : t("reading.difficulty.clickToShowWords", { level })}
                >
                  <span
                    className={`w-3 h-3 rounded ${
                      isSelected ? LEVEL_COLORS[level].dot : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium">{level}</span>
                  <span className="text-muted-foreground">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-full max-h-[300px] overflow-y-auto">
            <p className="whitespace-pre-wrap leading-relaxed">
              <HighlightedText text={text} cefrResult={cefrResult} selectedLevels={selectedLevels} />
            </p>
          </div>
        </>
      )}
    </div>
  );
}

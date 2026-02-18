"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { Button } from "@/components/ui/button";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function ExtractedText() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, addHighlightedWord, removeHighlightedWord } = useReadingStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseUp = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText && selectedText.length > 0 && selectedText.length <= 50) {
      const selectionObj = window.getSelection();
      if (selectionObj && selectionObj.rangeCount > 0) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSelection({
            text: selectedText,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 40,
          });
          return;
        }
      }
    }
    setSelection(null);
  }, []);

  const handleAddWord = useCallback(() => {
    if (selection?.text) {
      const words = selection.text.split(/\s+/).filter(w => w.length > 0);
      words.forEach(word => addHighlightedWord(word));
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, addHighlightedWord]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".selection-popup")) {
        setSelection(null);
      }
    });

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <h3 className="font-semibold text-lg border-b mb-4 leading-10">
        {t("reading.extractedText.title")}
      </h3>
      
      {highlightedWords.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium mb-2">
            {t("reading.extractedText.highlightedWords")} ({highlightedWords.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {highlightedWords.map((word) => (
              <span
                key={word}
                className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm cursor-pointer hover:opacity-75"
                onClick={() => removeHighlightedWord(word)}
                title={t("reading.extractedText.clickToRemove")}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="prose prose-slate dark:prose-invert max-w-full relative" ref={containerRef}>
        <MagicDown
          value={extractedText}
          onChange={() => {}}
          hideTools
        />
        {selection && (
          <Button
            size="sm"
            className="selection-popup absolute z-50 shadow-md"
            style={{ left: selection.x, top: selection.y, transform: "translateX(-50%)" }}
            onClick={handleAddWord}
          >
            <Plus className="h-4 w-4" />
            <span>{t("reading.extractedText.addWord")}</span>
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {t("reading.extractedText.highlightTip")}
      </p>
    </section>
  );
}

export default ExtractedText;

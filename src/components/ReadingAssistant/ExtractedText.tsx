"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useReadingStore } from "@/store/reading";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function ExtractedText() {
  const { t } = useTranslation();
  const { extractedText, highlightedWords, removeHighlightedWord } = useReadingStore();

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

      <div className="prose prose-slate dark:prose-invert max-w-full">
        <MagicDown
          value={extractedText}
          onChange={() => {}}
          hideTools
        />
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {t("reading.extractedText.highlightTip")}
      </p>
    </section>
  );
}

export default ExtractedText;

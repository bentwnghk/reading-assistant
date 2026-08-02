"use client";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Wand2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVocabularyStore } from "@/store/vocabulary";

function AutoSelectPanel({ entryType = "word" }: { entryType?: "word" | "phrase" }) {
  const { t } = useTranslation();
  const { autoSelectForReview, words } =
    useVocabularyStore();

  const scopedWords = useMemo(
    () =>
      words.filter((w) =>
        entryType === "phrase"
          ? w.entryType === "phrase"
          : w.entryType !== "phrase",
      ),
    [words, entryType],
  );

  const [count, setCount] = useState(10);
  const [strategy, setStrategy] = useState<VocabularySelectionStrategy>("due");

  const handleAutoSelect = useCallback(() => {
    autoSelectForReview(count, strategy, entryType);
  }, [count, strategy, autoSelectForReview, entryType]);

  const strategies: { key: VocabularySelectionStrategy; label: string }[] = [
    { key: "due", label: t("vocabulary.strategy.due") },
    {
      key: "hardest",
      label: t(
        entryType === "phrase"
          ? "vocabulary.strategy.hardestPhrase"
          : "vocabulary.strategy.hardest"
      ),
    },
    {
      key: "newest",
      label: t(
        entryType === "phrase"
          ? "vocabulary.strategy.newestPhrase"
          : "vocabulary.strategy.newest"
      ),
    },
    { key: "random", label: t("vocabulary.strategy.random") },
    {
      key: "weakest",
      label: t(
        entryType === "phrase"
          ? "vocabulary.strategy.weakestPhrase"
          : "vocabulary.strategy.weakest"
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Wand2 className="h-4 w-4 mr-1" />
            {t("vocabulary.autoSelect")}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">
                {t(
                  entryType === "phrase"
                    ? "vocabulary.phraseCount"
                    : "vocabulary.wordCount"
                )}
              </label>
              <Input
                type="number"
                min={1}
                max={Math.min(scopedWords.length, 100)}
                value={count}
                onChange={(e) =>
                  setCount(
                    Math.max(
                      1,
                      Math.min(
                        scopedWords.length,
                        parseInt(e.target.value) || 1
                      )
                    )
                  )
                }
                className="mt-1 h-8"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("vocabulary.selectStrategy")}
              </label>
              <div className="mt-1 space-y-1">
                {strategies.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStrategy(s.key)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                      strategy === s.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={handleAutoSelect}>
              {t(
                entryType === "phrase"
                  ? "vocabulary.selectPhrases"
                  : "vocabulary.selectWords",
                { count },
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default AutoSelectPanel;

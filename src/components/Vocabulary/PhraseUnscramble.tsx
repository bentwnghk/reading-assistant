"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";

interface PhraseUnscrambleProps {
  /** Phrases to practice (each entry's `word` is the chunk, plus a meaning). */
  phrases: { word: string; englishDefinition: string; chineseDefinition: string }[];
  onComplete?: (results: { word: string; correct: boolean }[]) => void;
}

interface ScrambledWord {
  id: number;
  text: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhraseUnscramble({ phrases, onComplete }: PhraseUnscrambleProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [arranged, setArranged] = useState<ScrambledWord[]>([]);
  const [pool, setPool] = useState<ScrambledWord[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [results, setResults] = useState<{ word: string; correct: boolean }[]>([]);

  const current = phrases[index];
  const correctWords = useMemo(
    () => (current?.word ? current.word.split(/\s+/).filter(Boolean) : []),
    [current],
  );

  const setupCurrent = useCallback(() => {
    if (!current) return;
    const words = current.word.split(/\s+/).filter(Boolean);
    let scrambled = shuffle(words.map((w, i) => ({ id: i, text: w })));
    // Ensure it's not already in order.
    if (scrambled.every((w, i) => w.text === words[i]) && words.length > 1) {
      scrambled = shuffle(scrambled);
    }
    setPool(scrambled);
    setArranged([]);
    setStatus("idle");
  }, [current]);

  useEffect(() => {
    setupCurrent();
  }, [setupCurrent]);

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => {
      if (index + 1 >= phrases.length) {
        onComplete?.(results);
        return;
      }
      setIndex((i) => i + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, index, phrases.length, results, onComplete]);

  if (!current || correctWords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("vocabulary.phrases.empty")}
      </div>
    );
  }

  const moveToPool = (id: number) => {
    if (status !== "idle") return;
    const word = arranged.find((w) => w.id === id);
    if (!word) return;
    setArranged((prev) => prev.filter((w) => w.id !== id));
    setPool((prev) => [...prev, word]);
  };

  const moveToArranged = (id: number) => {
    if (status !== "idle") return;
    const word = pool.find((w) => w.id === id);
    if (!word) return;
    setPool((prev) => prev.filter((w) => w.id !== id));
    setArranged((prev) => [...prev, word]);
  };

  const check = () => {
    const arrangedText = arranged.map((w) => w.text).join(" ");
    const correctText = correctWords.join(" ");
    const isCorrect = arrangedText.toLowerCase() === correctText.toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");
    setResults((prev) => [...prev, { word: current.word, correct: isCorrect }]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {t("vocabulary.phrases.progress", { current: index + 1, total: phrases.length })}
        </span>
        {status === "idle" && (
          <Button onClick={check} disabled={arranged.length === 0} size="sm">
            <Check className="h-4 w-4 mr-1" />
            {t("vocabulary.phrases.check")}
          </Button>
        )}
      </div>

      <div className="rounded-lg border p-6 mb-4 text-center">
        <p className="text-sm text-muted-foreground">{current.englishDefinition}</p>
        <p className="text-xs text-muted-foreground">{current.chineseDefinition}</p>
      </div>

      {/* Arranged (target) area */}
      <div
        className={cn(
          "min-h-[60px] rounded-md border-2 border-dashed p-3 flex flex-wrap gap-2 items-center mb-4 transition-colors",
          status === "correct" && "border-green-500 bg-green-500/5",
          status === "wrong" && "border-red-500 bg-red-500/5",
        )}
      >
        {arranged.length === 0 && status === "idle" && (
          <span className="text-sm text-muted-foreground w-full text-center">
            {t("vocabulary.phrases.arrangeHint")}
          </span>
        )}
        {arranged.map((w) => (
          <button
            key={`arr-${w.id}`}
            onClick={() => moveToPool(w.id)}
            disabled={status !== "idle"}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-70"
          >
            {w.text}
          </button>
        ))}
        {status === "correct" && (
          <span className="text-green-600 dark:text-green-400 text-sm font-medium ml-auto">
            <Check className="inline h-4 w-4 mr-1" />
            {t("vocabulary.phrases.correct")}
          </span>
        )}
        {status === "wrong" && (
          <span className="text-red-600 dark:text-red-400 text-sm font-medium ml-auto">
            <X className="inline h-4 w-4 mr-1" />
            {t("vocabulary.phrases.wrong")}
          </span>
        )}
      </div>

      {/* Pool (source) area */}
      {status === "idle" && (
        <div className="rounded-md border p-3 flex flex-wrap gap-2 items-center justify-center min-h-[56px]">
          {pool.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("vocabulary.phrases.allPlaced")}</span>
          ) : (
            pool.map((w) => (
              <button
                key={`pool-${w.id}`}
                onClick={() => moveToArranged(w.id)}
                className="px-3 py-1.5 rounded-md bg-muted hover:bg-accent text-sm font-medium transition-colors"
              >
                {w.text}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

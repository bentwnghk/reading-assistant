"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { Layers, ClipboardList, Shuffle, Inbox, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVocabularyStore } from "@/store/vocabulary";
import { isDueForReview } from "@/utils/srs";
import PhraseUnscramble from "./PhraseUnscramble";

const ReviewHistory = dynamic(() => import("./ReviewHistory"));

type PhraseMode = "list" | "flashcard" | "quiz" | "unscramble";

interface PhrasesTabProps {
  onReviewFlashcard: () => void;
  onReviewQuiz: () => void;
  onUnscrambleComplete?: (results: { word: string; correct: boolean }[]) => void;
}

export default function PhrasesTab({ onReviewFlashcard, onReviewQuiz, onUnscrambleComplete }: PhrasesTabProps) {
  const { t } = useTranslation();
  const { words, setReviewQueue } = useVocabularyStore();
  const [mode, setMode] = useState<PhraseMode>("list");

  const phrases = useMemo(
    () => words.filter((w) => w.entryType === "phrase"),
    [words],
  );

  const dueCount = useMemo(
    () => phrases.filter(isDueForReview).length,
    [phrases],
  );

  const startMode = (m: PhraseMode) => {
    if (m === "flashcard" || m === "quiz") {
      setReviewQueue(phrases);
      if (m === "flashcard") onReviewFlashcard();
      else onReviewQuiz();
      return;
    }
    setMode(m);
  };

  if (mode === "unscramble") {
    if (phrases.length === 0) {
      setMode("list");
      return null;
    }
    return (
      <div>
        <div className="flex justify-end mb-3">
          <Button onClick={() => setMode("list")} variant="ghost" size="sm">
            {t("vocabulary.phrases.backToList")}
          </Button>
        </div>
        <PhraseUnscramble
          phrases={phrases.map((p) => ({
            word: p.word,
            englishDefinition: p.englishDefinition,
            chineseDefinition: p.chineseDefinition,
          }))}
          onComplete={(results) => {
            onUnscrambleComplete?.(results);
            setMode("list");
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          onClick={() => startMode("flashcard")}
          disabled={phrases.length === 0}
          size="sm"
          variant="outline"
        >
          <Layers className="h-4 w-4 mr-1" />
          {t("vocabulary.phrases.startFlashcard")}
        </Button>
        <Button
          onClick={() => startMode("quiz")}
          disabled={phrases.length === 0}
          size="sm"
          variant="outline"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          {t("vocabulary.phrases.startQuiz")}
        </Button>
        <Button
          onClick={() => startMode("unscramble")}
          disabled={phrases.length === 0}
          size="sm"
          variant="outline"
        >
          <Shuffle className="h-4 w-4 mr-1" />
          {t("vocabulary.phrases.startUnscramble")}
        </Button>
        <span className="text-sm text-muted-foreground ml-auto flex items-center gap-3">
          {dueCount > 0 && (
            <span className="flex items-center gap-1 text-orange-500">
              <Clock className="h-3.5 w-3.5" />
              {t("vocabulary.phrases.dueCount", { count: dueCount })}
            </span>
          )}
          {t("vocabulary.phrases.count", { count: phrases.length })}
        </span>
      </div>

      {phrases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>{t("vocabulary.phrases.empty")}</p>
          <p className="text-xs mt-1">{t("vocabulary.phrases.emptyHint")}</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">{t("vocabulary.phrases.colChunk")}</th>
                <th className="text-left p-2 font-medium hidden sm:table-cell">{t("vocabulary.phrases.colPattern")}</th>
                <th className="text-left p-2 font-medium">{t("vocabulary.phrases.colMeaning")}</th>
                <th className="text-left p-2 font-medium hidden md:table-cell">{t("vocabulary.phrases.colZh")}</th>
              </tr>
            </thead>
            <tbody>
              {phrases.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-medium">{p.word}</td>
                  <td className="p-2 hidden sm:table-cell">
                    <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                      {p.partOfSpeech}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">{p.englishDefinition}</td>
                  <td className="p-2 text-muted-foreground hidden md:table-cell">{p.chineseDefinition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phrase-scoped review history */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
          <History className="h-4 w-4" />
          {t("vocabulary.phrases.historyTitle")}
        </h3>
        <ReviewHistory fixedEntryType="phrase" />
      </div>
    </div>
  );
}

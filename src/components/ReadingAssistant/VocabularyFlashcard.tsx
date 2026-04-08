"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Shuffle, RotateCcw, Volume2, Loader2, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { logActivity } from "@/utils/activityLogger";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { cn } from "@/utils/style";
import { sortGlossaryByPriority, getWordStats } from "@/utils/vocabulary";

type SRSAction = "again" | "hard" | "good" | "easy";

interface VocabularyFlashcardProps {
  glossary: GlossaryEntry[];
  mergedRatings?: Record<string, GlossaryRating>;
}

function VocabularyFlashcard({ glossary, mergedRatings }: VocabularyFlashcardProps) {
  const { t } = useTranslation();
  const { id, glossaryRatings, setGlossaryRating, backup } = useReadingStore();
  const effectiveRatings = mergedRatings ?? glossaryRatings;
  const { update, save } = useHistoryStore();
  const { ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy, autoSpeakFlashcard } = useSettingStore();

  const [reviewQueue, setReviewQueue] = useState<GlossaryEntry[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isPrioritized, setIsPrioritized] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [srsCounts, setSrsCounts] = useState<Record<SRSAction, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [totalOriginal, setTotalOriginal] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const wordStats = useMemo(() => {
    return getWordStats(glossary, effectiveRatings);
  }, [glossary, effectiveRatings]);

  const buildQueue = useCallback((shuffled: boolean, prioritized: boolean): GlossaryEntry[] => {
    return sortGlossaryByPriority(glossary, effectiveRatings, {
      prioritize: prioritized,
      shuffle: shuffled,
    });
  }, [glossary, effectiveRatings]);

  useEffect(() => {
    const queue = buildQueue(isShuffled, isPrioritized);
    setReviewQueue(queue);
    setTotalOriginal(queue.length);
    setIsReviewComplete(false);
    setSrsCounts({ again: 0, hard: 0, good: 0, easy: 0 });
    setIsFlipped(false);
  }, [glossary, isShuffled, isPrioritized, buildQueue]);

  const currentEntry = reviewQueue[0] ?? null;
  const remainingCount = reviewQueue.length;

  const highlightWord = (text: string, word: string) => {
    if (!word) return text;
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === word.toLowerCase()
        ? <span key={index} className="text-primary font-semibold">{part}</span>
        : part
    );
  };

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleShuffle = () => {
    setIsShuffled((prev) => !prev);
  };

  const handlePrioritize = () => {
    setIsPrioritized((prev) => !prev);
  };

  const handleResetOrder = () => {
    setIsShuffled(false);
    setIsPrioritized(false);
  };

  const handleRestart = () => {
    setIsReviewComplete(false);
    setSrsCounts({ again: 0, hard: 0, good: 0, easy: 0 });
    setIsFlipped(false);
    const queue = buildQueue(isShuffled, isPrioritized);
    setReviewQueue(queue);
    setTotalOriginal(queue.length);
  };

  const handleSRS = useCallback((action: SRSAction) => {
    if (!currentEntry || reviewQueue.length === 0) return;

    const currentCard = reviewQueue[0];
    const remaining = reviewQueue.slice(1);
    let newQueue: GlossaryEntry[];

    switch (action) {
      case "again":
        newQueue = [currentCard, ...remaining];
        break;
      case "hard": {
        const mid = Math.floor(remaining.length / 2);
        newQueue = [...remaining.slice(0, mid), currentCard, ...remaining.slice(mid)];
        break;
      }
      case "good":
        newQueue = [...remaining, currentCard];
        break;
      case "easy":
        newQueue = [...remaining];
        break;
    }

    if (action === "again" || action === "hard") {
      setGlossaryRating(currentCard.word, "hard");
    }

    logActivity("flashcard_review", {
      sessionId: id || undefined,
      details: { cardsReviewed: 1, wordCount: totalOriginal },
    });

    if (id) {
      const session = backup();
      const updated = update(id, session);
      if (!updated) {
        save(session);
      }
    }

    setSrsCounts((prev) => ({ ...prev, [action]: prev[action] + 1 }));
    setReviewQueue(newQueue);
    setIsFlipped(false);

    if (newQueue.length === 0) {
      setIsReviewComplete(true);
    }
  }, [currentEntry, reviewQueue, id, totalOriginal, setGlossaryRating, backup, update, save]);

  const speakWord = useCallback(async (word: string) => {
    if (!word) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsTTSLoading(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      let url: string;
      if (mode === "local") {
        url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
        if (openaicompatibleApiKey) {
          headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
        }
      } else if (mode === "subscription") {
        url = "/api/ai/subscription/v1/audio/speech";
      } else {
        url = "/api/ai/openaicompatible/v1/audio/speech";
        if (accessPassword) {
          headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "tts-1",
          input: word,
          voice: ttsVoice,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TTS request failed (${response.status}): ${errText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audioRef.current = audio;

        audio.oncanplay = () => {
          audio.play().then(resolve).catch(reject);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(new Error("Audio element error"));
        };

        audio.src = audioUrl;
        audio.load();
      });
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsTTSLoading(false);
    }
  }, [ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]);

  const handleSpeak = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentEntry?.word) {
      speakWord(currentEntry.word);
    }
  }, [currentEntry, speakWord]);

  useEffect(() => {
    if (autoSpeakFlashcard && currentEntry?.word && !isReviewComplete) {
      speakWord(currentEntry.word);
    }
  }, [currentEntry, autoSpeakFlashcard, speakWord, isReviewComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReviewComplete) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, isReviewComplete]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (glossary.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.flashcard.noCards")}</p>
      </div>
    );
  }

  if (isReviewComplete) {
    const total = srsCounts.again + srsCounts.hard + srsCounts.good + srsCounts.easy;
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">{t("reading.glossary.flashcard.reviewComplete")}</h3>
          <p className="text-muted-foreground">
            {t("reading.glossary.flashcard.reviewCompleteDesc", { total: totalOriginal })}
          </p>
        </div>
        <div className="w-full max-w-md bg-muted/30 rounded-xl p-4 space-y-2">
          <div className="text-sm font-medium text-center mb-3">
            {t("reading.glossary.flashcard.srsStats")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-rose-100 dark:bg-rose-950/30 rounded-lg px-3 py-2">
              <span className="text-sm text-rose-700 dark:text-rose-400">{t("reading.glossary.flashcard.again")}</span>
              <span className="font-bold text-rose-700 dark:text-rose-400">{srsCounts.again}</span>
            </div>
            <div className="flex items-center justify-between bg-orange-100 dark:bg-orange-950/30 rounded-lg px-3 py-2">
              <span className="text-sm text-orange-700 dark:text-orange-400">{t("reading.glossary.flashcard.hard")}</span>
              <span className="font-bold text-orange-700 dark:text-orange-400">{srsCounts.hard}</span>
            </div>
            <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-950/30 rounded-lg px-3 py-2">
              <span className="text-sm text-blue-700 dark:text-blue-400">{t("reading.glossary.flashcard.good")}</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">{srsCounts.good}</span>
            </div>
            <div className="flex items-center justify-between bg-green-100 dark:bg-green-950/30 rounded-lg px-3 py-2">
              <span className="text-sm text-green-700 dark:text-green-400">{t("reading.glossary.flashcard.easy")}</span>
              <span className="font-bold text-green-700 dark:text-green-400">{srsCounts.easy}</span>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            {t("reading.glossary.flashcard.totalReviews", { total })}
          </div>
        </div>
        <Button onClick={handleRestart} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t("reading.glossary.flashcard.restart")}
        </Button>
      </div>
    );
  }

  if (!currentEntry) return null;

  const hasRatings = wordStats.hard > 0 || wordStats.medium > 0 || wordStats.easy > 0;
  const progressPercent = totalOriginal > 0 ? ((totalOriginal - remainingCount) / totalOriginal) * 100 : 0;

  const srsButtons: { action: SRSAction; colorClass: string; hoverClass: string; borderClass: string }[] = [
    { action: "again", colorClass: "bg-rose-500 hover:bg-rose-600 text-white", hoverClass: "", borderClass: "" },
    { action: "hard", colorClass: "bg-orange-500 hover:bg-orange-600 text-white", hoverClass: "", borderClass: "" },
    { action: "good", colorClass: "bg-blue-500 hover:bg-blue-600 text-white", hoverClass: "", borderClass: "" },
    { action: "easy", colorClass: "bg-green-500 hover:bg-green-600 text-white", hoverClass: "", borderClass: "" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {isPrioritized && hasRatings && (
        <div className="text-xs text-muted-foreground">
          {t("reading.glossary.wordStats", {
            hard: wordStats.hard,
            medium: wordStats.medium,
            easy: wordStats.easy
          })}
        </div>
      )}

      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("reading.glossary.flashcard.remaining", { remaining: remainingCount, total: totalOriginal })}</span>
          <span className="text-muted-foreground/70">
            <span className="text-rose-500">A:{srsCounts.again}</span>
            {" "}<span className="text-orange-500">H:{srsCounts.hard}</span>
            {" "}<span className="text-blue-500">G:{srsCounts.good}</span>
            {" "}<span className="text-green-500">E:{srsCounts.easy}</span>
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div
        className="relative w-full max-w-md aspect-[3/4] cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-500 transform-style-preserve-3d",
            isFlipped && "rotate-y-180"
          )}
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : '',
          }}
        >
          <div
            className={cn(
              "absolute inset-0 backface-hidden",
              "bg-gradient-to-br from-card via-card to-primary/5 border-2 rounded-xl shadow-lg",
              "hover:shadow-xl transition-shadow duration-300",
              "flex flex-col items-center justify-center p-6"
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={cn(
                "font-extrabold text-center",
                (currentEntry.syllabification || currentEntry.word).length > 18 ? "text-3xl" : (currentEntry.syllabification || currentEntry.word).length > 12 ? "text-4xl" : "text-5xl"
              )}>
                {currentEntry.syllabification || currentEntry.word}
              </div>
              <button
                onClick={handleSpeak}
                disabled={isTTSLoading}
                className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                title={t("reading.extractedText.readAloud")}
              >
                {isTTSLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Volume2 className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
            {currentEntry.syllabification && currentEntry.syllabification !== currentEntry.word && (
              <div className="text-base font-medium text-muted-foreground mb-2">
                [ {currentEntry.word} ]
              </div>
            )}
            {currentEntry.partOfSpeech && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-base font-medium">
                {currentEntry.partOfSpeech}
              </div>
            )}
            <div className="absolute bottom-4 text-xs text-muted-foreground">
              <span className="hidden sm:inline">{t("reading.glossary.flashcard.clickFlip")}</span>
              <span className="sm:hidden">Tap to flip</span>
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 backface-hidden rotate-y-180",
              "bg-gradient-to-br from-card via-card to-amber-100 dark:to-amber-950/50 border-2 border-amber-200 dark:border-amber-800 rounded-xl shadow-lg",
              "hover:shadow-xl transition-shadow duration-300",
              "flex flex-col items-center justify-center p-6 overflow-y-auto"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="text-3xl font-extrabold text-center">
                {currentEntry.syllabification || currentEntry.word}
              </div>
              <button
                onClick={handleSpeak}
                disabled={isTTSLoading}
                className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                title={t("reading.extractedText.readAloud")}
              >
                {isTTSLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
            {currentEntry.syllabification && currentEntry.syllabification !== currentEntry.word && (
              <div className="text-base text-muted-foreground mb-2">
                [ {currentEntry.word} ]
              </div>
            )}
            {currentEntry.partOfSpeech && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-base font-medium mb-4">
                {currentEntry.partOfSpeech}
              </div>
            )}
            <div className="text-center space-y-4 w-full">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">English Definition</div>
                <div className="text-base">{currentEntry.englishDefinition}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">中文解釋</div>
                <div className="text-base font-noto-sans-tc">{currentEntry.chineseDefinition}</div>
              </div>
              {currentEntry.example && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Example 例句</div>
                  <div className="text-base italic">
                    &ldquo;{highlightWord(currentEntry.example, currentEntry.word)}&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="w-full max-w-md space-y-3">
          <div className="text-center text-sm text-muted-foreground mb-2">
            {t("reading.glossary.flashcard.rateCard")}
          </div>
          <div className="flex gap-2 justify-center">
            {srsButtons.map(({ action, colorClass }) => (
              <Button
                key={action}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSRS(action);
                }}
                className={cn("flex-1 font-medium", colorClass)}
              >
                {t(`reading.glossary.flashcard.${action}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant={isPrioritized ? "default" : "secondary"}
          size="sm"
          onClick={handlePrioritize}
        >
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.prioritizeHard")}</span>
        </Button>

        <Button
          variant={isShuffled ? "default" : "secondary"}
          size="sm"
          onClick={handleShuffle}
        >
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.flashcard.shuffle")}</span>
        </Button>

        {(isShuffled || isPrioritized) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetOrder}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reading.glossary.regenerate")}</span>
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="hidden sm:inline">Space / Enter: {t("reading.glossary.flashcard.flip")}</span>
        <span className="sm:hidden">Tap to flip</span>
      </div>
    </div>
  );
}

export default VocabularyFlashcard;

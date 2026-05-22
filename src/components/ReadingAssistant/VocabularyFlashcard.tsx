"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Shuffle, RotateCcw, Volume2, Loader2, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { logActivity } from "@/utils/activityLogger";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { cn } from "@/utils/style";
import { sortGlossaryByPriority } from "@/utils/vocabulary";

interface VocabularyFlashcardProps {
  glossary: GlossaryEntry[];
  mergedRatings?: Record<string, GlossaryRating>;
  onWordAction?: (word: string, action: "again" | "hard" | "good" | "easy") => void;
  onComplete?: (results: { word: string; correct: boolean; rating: SRSAction; attempts: number }[], ratingCounts: VocabularyRatingCounts) => void;
}

type SRSAction = "again" | "hard" | "good" | "easy";

interface SRSCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

function VocabularyFlashcard({ glossary, mergedRatings, onWordAction, onComplete }: VocabularyFlashcardProps) {
  const { t } = useTranslation();
  const { id, glossaryRatings, incrementFlashcardReviewCount } = useReadingStore();
  const effectiveRatings = mergedRatings ?? glossaryRatings;
  const { ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy, autoSpeakFlashcard } = useSettingStore();

  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isPrioritized, setIsPrioritized] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<GlossaryEntry[]>([]);
  const [totalOriginal, setTotalOriginal] = useState(0);
  const [srsCounts, setSrsCounts] = useState<SRSCounts>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const flashcardResultsRef = useRef<Map<string, { correct: boolean; rating: SRSAction; attempts: number }>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep a ref to the latest effectiveRatings so toolbar handlers always use fresh data
  // without triggering a full session reset on every rating change.
  const effectiveRatingsRef = useRef(effectiveRatings);
  useEffect(() => {
    effectiveRatingsRef.current = effectiveRatings;
  }, [effectiveRatings]);

  const buildQueue = useCallback(
    (list: GlossaryEntry[], ratings: Record<string, GlossaryRating>, shuffle: boolean, prioritize: boolean) =>
      sortGlossaryByPriority(list, ratings, { prioritize, shuffle }),
    []
  );

  const resetSession = useCallback((queue: GlossaryEntry[]) => {
    setReviewQueue(queue);
    setTotalOriginal(queue.length);
    setIsFlipped(false);
    setIsReviewComplete(false);
    setSrsCounts({ again: 0, hard: 0, good: 0, easy: 0 });
  }, []);

  // Initialize queue only when the glossary list itself changes, not on every rating update.
  // isShuffled/isPrioritized are intentionally omitted — toolbar handlers manage those resets.
  useEffect(() => {
    resetSession(buildQueue(glossary, effectiveRatingsRef.current, isShuffled, isPrioritized));
  }, [glossary]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentEntry = reviewQueue[0];

  const highlightWord = (text: string, word: string) => {
    if (!word) return text;
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === word.toLowerCase() ? (
        <span key={index} className="text-primary font-semibold">{part}</span>
      ) : (
        part
      )
    );
  };

  const handleFlip = useCallback(() => setIsFlipped((prev) => !prev), []);

  const handleShuffle = () => {
    const next = !isShuffled;
    setIsShuffled(next);
    resetSession(buildQueue(glossary, effectiveRatingsRef.current, next, isPrioritized));
  };

  const handlePrioritize = () => {
    const next = !isPrioritized;
    setIsPrioritized(next);
    resetSession(buildQueue(glossary, effectiveRatingsRef.current, isShuffled, next));
  };

  const handleResetOrder = () => {
    setIsShuffled(false);
    setIsPrioritized(false);
    resetSession(buildQueue(glossary, effectiveRatingsRef.current, false, false));
  };

  const handleRestart = () => {
    resetSession(buildQueue(glossary, effectiveRatingsRef.current, isShuffled, isPrioritized));
  };

  const handleSRS = useCallback(
    (action: SRSAction) => {
      if (!currentEntry || reviewQueue.length === 0) return;

      const current = reviewQueue[0];
      const remaining = reviewQueue.slice(1);
      let newQueue: GlossaryEntry[];

      switch (action) {
        case "again":
          // Insert at position 2 of remaining (立刻再次複習)
          if (remaining.length === 0) {
            newQueue = [current];
          } else {
            newQueue = [remaining[0], current, ...remaining.slice(1)];
          }
          break;
        case "hard":
          // Insert at the middle of remaining
          {
            const mid = Math.ceil(remaining.length / 2);
            newQueue = [...remaining.slice(0, mid), current, ...remaining.slice(mid)];
          }
          break;
        case "good":
          // Move to end
          newQueue = [...remaining, current];
          break;
        case "easy":
        default:
          // Remove from review
          newQueue = [...remaining];
          break;
      }

      setSrsCounts((prev) => ({ ...prev, [action]: prev[action] + 1 }));

      const HARDEST: Record<SRSAction, number> = { again: 3, hard: 2, good: 1, easy: 0 };
      const isCorrect = action === "good" || action === "easy";
      const prev = flashcardResultsRef.current.get(current.word);
      const hardestRating = prev && HARDEST[prev.rating] > HARDEST[action] ? prev.rating : action;
      flashcardResultsRef.current.set(current.word, {
        correct: isCorrect,
        rating: hardestRating,
        attempts: (prev?.attempts ?? 0) + 1,
      });

      logActivity("flashcard_review", {
        sessionId: id || undefined,
        details: { cardsReviewed: 1, wordCount: totalOriginal },
      });

      if (onWordAction) {
        onWordAction(current.word, action);
      }

      setReviewQueue(newQueue);
      setIsFlipped(false);

      if (newQueue.length === 0) {
        setIsReviewComplete(true);
        incrementFlashcardReviewCount();
        if (onComplete) {
          const results = Array.from(flashcardResultsRef.current.entries()).map(
            ([word, data]) => ({ word, correct: data.correct, rating: data.rating, attempts: data.attempts })
          );
          onComplete(results, { ...srsCounts, [action]: srsCounts[action] + 1 });
          flashcardResultsRef.current.clear();
        }
      }
    },
    [currentEntry, reviewQueue, id, totalOriginal, incrementFlashcardReviewCount, onWordAction]
  );

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakWord = useCallback(
    async (word: string) => {
      if (!word) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsTTSLoading(true);
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        let url: string;
        if (mode === "local") {
          url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
          if (openaicompatibleApiKey) headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
        } else if (mode === "subscription") {
          url = "/api/ai/subscription/v1/audio/speech";
        } else {
          url = "/api/ai/openaicompatible/v1/audio/speech";
          if (accessPassword)
            headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
        }
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: "tts-1", input: word, voice: ttsVoice, response_format: "mp3", speed: ttsPlaybackRate }),
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
          audio.oncanplay = () => audio.play().then(resolve).catch(reject);
          audio.onended = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; };
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
    },
    [ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]
  );

  const handleSpeak = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentEntry?.word) speakWord(currentEntry.word);
    },
    [currentEntry, speakWord]
  );

  // Auto-speak only when the card word actually changes (not on every queue reorder)
  const prevWordRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (autoSpeakFlashcard && currentEntry?.word && currentEntry.word !== prevWordRef.current) {
      prevWordRef.current = currentEntry.word;
      speakWord(currentEntry.word);
    }
  }, [currentEntry, autoSpeakFlashcard, speakWord]);

  // Keyboard: Space/Enter to flip (left/right navigation removed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!glossary.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.flashcard.noCards")}</p>
      </div>
    );
  }

  // Guard: reviewQueue may be transiently empty before isReviewComplete flips in the same cycle
  if (!currentEntry && !isReviewComplete) {
    return null;
  }

  const remaining = reviewQueue.length;
  const progressPercent = totalOriginal > 0 ? ((totalOriginal - remaining) / totalOriginal) * 100 : 0;

  const SRSStats = ({ counts }: { counts: SRSCounts }) => (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-rose-500 dark:text-rose-400">{t("reading.glossary.flashcard.again")}: {counts.again}</span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-orange-500 dark:text-orange-400">{t("reading.glossary.flashcard.hard")}: {counts.hard}</span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-blue-500 dark:text-blue-400">{t("reading.glossary.flashcard.good")}: {counts.good}</span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-green-500 dark:text-green-400">{t("reading.glossary.flashcard.easy")}: {counts.easy}</span>
    </span>
  );

  // Shared toolbar component
  const Toolbar = () => (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Button variant={isPrioritized ? "default" : "secondary"} size="sm" onClick={handlePrioritize}>
        <Target className="h-4 w-4" />
        <span>{t("reading.glossary.prioritizeHard")}</span>
      </Button>
      <Button variant={isShuffled ? "default" : "secondary"} size="sm" onClick={handleShuffle}>
        <Shuffle className="h-4 w-4" />
        <span>{t("reading.glossary.flashcard.shuffle")}</span>
      </Button>
      {(isShuffled || isPrioritized) && (
        <Button variant="outline" size="sm" onClick={handleResetOrder}>
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.regenerate")}</span>
        </Button>
      )}
    </div>
  );

  // ── Completion screen ─────────────────────────────────────────────────────
  if (isReviewComplete) {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <Toolbar />

        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("reading.glossary.flashcard.remaining", { remaining: 0, total: totalOriginal })}</span>
            <SRSStats counts={srsCounts} />
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full w-full transition-all duration-300" />
          </div>
        </div>

        <div className="w-full max-w-md bg-gradient-to-br from-card via-card to-green-50 dark:to-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl shadow-lg p-8 flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h3 className="text-2xl font-bold text-center">{t("reading.glossary.flashcard.reviewComplete")}</h3>
          <p className="text-muted-foreground text-center text-sm">
            {t("reading.glossary.flashcard.reviewCompleteDesc", { total: totalOriginal })}
          </p>

          <div className="grid grid-cols-4 gap-3 w-full mt-2">
            <div className="flex flex-col items-center gap-1 bg-rose-50 dark:bg-rose-950/30 rounded-lg p-2">
              <span className="text-xs text-rose-500 font-medium">{t("reading.glossary.flashcard.again")}</span>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{srsCounts.again}</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-orange-50 dark:bg-orange-950/30 rounded-lg p-2">
              <span className="text-xs text-orange-500 font-medium">{t("reading.glossary.flashcard.hard")}</span>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{srsCounts.hard}</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
              <span className="text-xs text-blue-500 font-medium">{t("reading.glossary.flashcard.good")}</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{srsCounts.good}</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
              <span className="text-xs text-green-500 font-medium">{t("reading.glossary.flashcard.easy")}</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{srsCounts.easy}</span>
            </div>
          </div>

          <Button onClick={handleRestart} className="mt-2 w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("reading.glossary.flashcard.restart")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main review UI ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Toolbar />

      {/* Progress bar */}
      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("reading.glossary.flashcard.remaining", { remaining, total: totalOriginal })}</span>
          <SRSStats counts={srsCounts} />
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md aspect-[3/4] cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div
          key={currentEntry.word}
          className={cn(
            "absolute inset-0 transition-transform duration-500 transform-style-preserve-3d",
            isFlipped && "rotate-y-180"
          )}
          style={{ transform: isFlipped ? "rotateY(180deg)" : "" }}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 backface-hidden",
              "bg-gradient-to-br from-card via-card to-primary/5 border-2 rounded-xl shadow-lg",
              "hover:shadow-xl transition-shadow duration-300",
              "flex flex-col items-center justify-center p-6"
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className={cn(
                  "font-extrabold text-center",
                  currentEntry.word.length > 18
                    ? "text-3xl"
                    : currentEntry.word.length > 12
                    ? "text-4xl"
                    : "text-5xl"
                )}
              >
                {currentEntry.word}
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
              <div className="text-xl font-medium text-muted-foreground mb-2">
                {currentEntry.syllabification}
              </div>
            )}
            {currentEntry.partOfSpeech && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-base font-medium">
                {currentEntry.partOfSpeech}
              </div>
            )}
            <div className="absolute bottom-4 text-xs text-muted-foreground">
              <span className="hidden sm:inline">{t("reading.glossary.flashcard.clickFlip")}</span>
              <span className="sm:hidden">{t("reading.glossary.flashcard.tapFlip")}</span>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 backface-hidden rotate-y-180",
              "bg-gradient-to-br from-card via-card to-emerald-100 dark:to-emerald-950/50 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl shadow-lg",
              "hover:shadow-xl transition-shadow duration-300",
              "flex flex-col items-center justify-center p-6 overflow-y-auto"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="text-3xl font-extrabold text-center">
                {currentEntry.word}
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
                {currentEntry.syllabification}
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

      {/* SRS buttons — only shown when card is flipped */}
      {isFlipped && (
        <div className="w-full max-w-md space-y-2">
          <div className="text-center text-sm text-muted-foreground">
            {t("reading.glossary.flashcard.rateCard")}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSRS("again"); }}
              className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              {t("reading.glossary.flashcard.again")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSRS("hard"); }}
              className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/50"
            >
              {t("reading.glossary.flashcard.hard")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSRS("good"); }}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              {t("reading.glossary.flashcard.good")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSRS("easy"); }}
              className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/50"
            >
              {t("reading.glossary.flashcard.easy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabularyFlashcard;

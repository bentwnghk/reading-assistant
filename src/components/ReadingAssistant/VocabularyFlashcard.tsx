"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw, Volume2, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { cn } from "@/utils/style";
import { sortGlossaryByPriority, getWordStats } from "@/utils/vocabulary";

interface VocabularyFlashcardProps {
  glossary: GlossaryEntry[];
}

function VocabularyFlashcard({ glossary }: VocabularyFlashcardProps) {
  const { t } = useTranslation();
  const { id, glossaryRatings, setGlossaryRating, backup } = useReadingStore();
  const { update, save } = useHistoryStore();
  const { ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy, autoSpeakFlashcard } = useSettingStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isPrioritized, setIsPrioritized] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentGlossary = useMemo(() => {
    return sortGlossaryByPriority(glossary, glossaryRatings, {
      prioritize: isPrioritized,
      shuffle: isShuffled,
    });
  }, [glossary, glossaryRatings, isPrioritized, isShuffled]);

  const wordStats = useMemo(() => {
    return getWordStats(glossary, glossaryRatings);
  }, [glossary, glossaryRatings]);

  const currentEntry = currentGlossary[currentIndex];
  const totalCount = currentGlossary.length;

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

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalCount - 1));
    setIsFlipped(false);
  }, [totalCount]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < totalCount - 1 ? prev + 1 : 0));
    setIsFlipped(false);
  }, [totalCount]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleShuffle = () => {
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handlePrioritize = () => {
    setIsPrioritized((prev) => !prev);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetOrder = () => {
    setIsShuffled(false);
    setIsPrioritized(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleRate = (rating: GlossaryRating) => {
    if (currentEntry) {
      setGlossaryRating(currentEntry.word, rating);
      if (id) {
        const session = backup();
        const updated = update(id, session);
        if (!updated) {
          save(session);
        }
      }
    }
    handleNext();
  };

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
    if (autoSpeakFlashcard && currentEntry?.word) {
      speakWord(currentEntry.word);
    }
  }, [currentIndex, isShuffled, isPrioritized, autoSpeakFlashcard, currentEntry, speakWord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext, handleFlip]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!currentEntry) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.flashcard.noCards")}</p>
      </div>
    );
  }

  const currentRating = glossaryRatings[currentEntry.word];
  const hasRatings = wordStats.hard > 0 || wordStats.medium > 0 || wordStats.easy > 0;

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
          <span>{currentIndex + 1} / {totalCount}</span>
          <span>{Math.round(((currentIndex + 1) / totalCount) * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
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
        >
          <div
            className={cn(
              "absolute inset-0 backface-hidden",
              "bg-gradient-to-br from-card via-card to-primary/5 border-2 rounded-xl shadow-lg",
              "hover:shadow-xl transition-shadow duration-300",
              "flex flex-col items-center justify-center p-6"
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="text-5xl font-extrabold text-center">
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
            {currentEntry.partOfSpeech && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-base font-medium">
                {currentEntry.partOfSpeech}
              </div>
            )}
            <div className="absolute bottom-4 text-xs text-muted-foreground">
              {t("reading.glossary.flashcard.clickFlip")}
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
            <div className="flex items-center justify-center gap-2 mb-2">
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
            <Button
              variant={currentRating === "easy" ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRate("easy");
              }}
              className="flex-1"
            >
              {t("reading.glossary.flashcard.easy")}
            </Button>
            <Button
              variant={currentRating === "medium" ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRate("medium");
              }}
              className="flex-1"
            >
              {t("reading.glossary.flashcard.medium")}
            </Button>
            <Button
              variant={currentRating === "hard" ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRate("hard");
              }}
              className="flex-1"
            >
              {t("reading.glossary.flashcard.hard")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.flashcard.previous")}</span>
        </Button>

        <Button
          variant={isPrioritized ? "default" : "secondary"}
          size="sm"
          onClick={handlePrioritize}
        >
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.prioritizeHard")}</span>
        </Button>

        {isShuffled || isPrioritized ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetOrder}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reading.glossary.regenerate")}</span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShuffle}
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reading.glossary.flashcard.shuffle")}</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
        >
          <span className="hidden sm:inline">{t("reading.glossary.flashcard.next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ChevronLeft className="h-3 w-3" /> Prev</span>
        <span className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Next</span>
        <span>Space: Flip</span>
      </div>
    </div>
  );
}

export default VocabularyFlashcard;

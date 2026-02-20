"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";

interface VocabularyFlashcardProps {
  glossary: GlossaryEntry[];
}

function VocabularyFlashcard({ glossary }: VocabularyFlashcardProps) {
  const { t } = useTranslation();
  const { glossaryRatings, setGlossaryRating } = useReadingStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledGlossary, setShuffledGlossary] = useState<GlossaryEntry[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    setShuffledGlossary(glossary);
  }, [glossary]);

  const currentGlossary = isShuffled ? shuffledGlossary : glossary;
  const currentEntry = currentGlossary[currentIndex];
  const totalCount = currentGlossary.length;

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
    const shuffled = [...glossary].sort(() => Math.random() - 0.5);
    setShuffledGlossary(shuffled);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetOrder = () => {
    setIsShuffled(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleRate = (rating: GlossaryRating) => {
    if (currentEntry) {
      setGlossaryRating(currentEntry.word, rating);
    }
    handleNext();
  };

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

  if (!currentEntry) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.flashcard.noCards")}</p>
      </div>
    );
  }

  const currentRating = glossaryRatings[currentEntry.word];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-sm text-muted-foreground">
        {t("reading.glossary.flashcard.cardProgress", { current: currentIndex + 1, total: totalCount })}
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
              "bg-card border-2 rounded-xl shadow-lg",
              "flex flex-col items-center justify-center p-6"
            )}
          >
            <div className="text-4xl font-bold text-center mb-4">
              {currentEntry.word}
            </div>
            {currentEntry.partOfSpeech && (
              <div className="text-sm text-muted-foreground italic">
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
              "bg-card border-2 rounded-xl shadow-lg",
              "flex flex-col items-center justify-center p-6 overflow-y-auto"
            )}
          >
            <div className="text-2xl font-bold mb-4 text-center">
              {currentEntry.word}
            </div>
            <div className="text-center space-y-4 w-full">
              <div>
                <div className="text-xs text-muted-foreground mb-1">English</div>
                <div className="text-sm">{currentEntry.englishDefinition}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">中文</div>
                <div className="text-sm font-noto-sans-tc">{currentEntry.chineseDefinition}</div>
              </div>
              {currentEntry.example && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Example</div>
                  <div className="text-sm italic text-muted-foreground">
                    &ldquo;{currentEntry.example}&rdquo;
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

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reading.glossary.flashcard.previous")}</span>
        </Button>

        {isShuffled ? (
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
    </div>
  );
}

export default VocabularyFlashcard;

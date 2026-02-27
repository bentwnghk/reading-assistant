"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { analyzeTextDifficulty, getCefrBadgeColor } from "@/utils/textDifficulty";

function getFleschDescription(score: number): string {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (College)";
  return "Very Difficult (Graduate)";
}

function DifficultyCard({
  title,
  text,
  difficulty,
  isAnalyzing,
}: {
  title: string;
  text: string | null;
  difficulty: TextDifficultyResult | null;
  isAnalyzing: boolean;
}) {
  const { t } = useTranslation();

  if (!text) {
    return (
      <div className="flex-1 p-4 border rounded-md bg-muted/30 text-center min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("reading.difficulty.noText")}</p>
      </div>
    );
  }

  if (isAnalyzing && !difficulty) {
    return (
      <div className="flex-1 p-4 border rounded-md bg-muted/30 min-h-[200px] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">{t("reading.difficulty.analyzing")}</span>
      </div>
    );
  }

  if (!difficulty) {
    return (
      <div className="flex-1 p-4 border rounded-md bg-muted/30 text-center min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("reading.difficulty.notAnalyzed")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 border rounded-md space-y-3 min-w-0">
      <h4 className="font-medium text-center border-b pb-2">{title}</h4>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Lexile</span>
          <span className="font-mono text-sm font-semibold">{difficulty.estimatedLexile}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">CEFR</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCefrBadgeColor(difficulty.cefrLevel)}`}>
            {difficulty.cefrLevel}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t("reading.difficulty.wordCount")}</span>
          <span className="text-sm">{difficulty.wordCount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t("reading.difficulty.sentenceCount")}</span>
          <span className="text-sm">{difficulty.sentenceCount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t("reading.difficulty.avgSentenceLength")}</span>
          <span className="text-sm">{difficulty.avgSentenceLength}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t("reading.difficulty.fleschReadingEase")}</span>
          <span className="text-sm" title={getFleschDescription(difficulty.fleschReadingEase)}>
            {difficulty.fleschReadingEase}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t("reading.difficulty.gradeLevel")}</span>
          <span className="text-sm">{Math.round(difficulty.fleschKincaidGrade)}</span>
        </div>
      </div>
    </div>
  );
}

export default function TextDifficultyAnalyzer() {
  const { t } = useTranslation();
  const {
    extractedText,
    adaptedText,
    simplifiedText,
    originalDifficulty,
    adaptedDifficulty,
    simplifiedDifficulty,
    setOriginalDifficulty,
    setAdaptedDifficulty,
    setSimplifiedDifficulty,
  } = useReadingStore();

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      if (extractedText) {
        const result = analyzeTextDifficulty(extractedText);
        if (result) setOriginalDifficulty(result);
      }
      if (adaptedText) {
        const result = analyzeTextDifficulty(adaptedText);
        if (result) setAdaptedDifficulty(result);
      }
      if (simplifiedText) {
        const result = analyzeTextDifficulty(simplifiedText);
        if (result) setSimplifiedDifficulty(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasAnyText = extractedText || adaptedText || simplifiedText;

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          {t("reading.difficulty.title")}
        </h3>
        <Button
          onClick={handleAnalyze}
          disabled={!hasAnyText || isAnalyzing}
          size="sm"
          variant="outline"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              <span>{t("reading.difficulty.analyzing")}</span>
            </>
          ) : (
            <span>{t("reading.difficulty.analyze")}</span>
          )}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <DifficultyCard
          title={t("reading.difficulty.original")}
          text={extractedText}
          difficulty={originalDifficulty}
          isAnalyzing={isAnalyzing}
        />
        <DifficultyCard
          title={t("reading.difficulty.adapted")}
          text={adaptedText}
          difficulty={adaptedDifficulty}
          isAnalyzing={isAnalyzing}
        />
        <DifficultyCard
          title={t("reading.difficulty.simplified")}
          text={simplifiedText}
          difficulty={simplifiedDifficulty}
          isAnalyzing={isAnalyzing}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        {t("reading.difficulty.disclaimer")}
      </p>
    </section>
  );
}

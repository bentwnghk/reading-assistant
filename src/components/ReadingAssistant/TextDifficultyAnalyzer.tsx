"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { analyzeTextDifficulty, getCefrBadgeColor, getFleschDescription } from "@/utils/textDifficulty";
import useReadingAssistant from "@/hooks/useReadingAssistant";

function AlgorithmicDifficultyCard({
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

function AIDifficultyCard({
  title,
  text,
  difficulty,
  isAnalyzing,
}: {
  title: string;
  text: string | null;
  difficulty: AIDifficultyResult | null;
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
        <span className="text-sm text-muted-foreground">{t("reading.difficulty.aiAnalyzing")}</span>
      </div>
    );
  }

  if (!difficulty) {
    return (
      <div className="flex-1 p-4 border rounded-md bg-muted/30 text-center min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("reading.difficulty.aiNotAnalyzed")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 border rounded-md space-y-3 min-w-0">
      <h4 className="font-medium text-center border-b pb-2">{title}</h4>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Lexile</span>
          <span className="font-mono text-sm font-semibold">{difficulty.lexileLevel}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">CEFR</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCefrBadgeColor(difficulty.cefrLevel as CEFRLevel)}`}>
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

        {difficulty.suitableFor && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">{t("reading.difficulty.suitableFor")}</p>
            <p className="text-xs">{difficulty.suitableFor.ageRange} ({difficulty.suitableFor.gradeLevel})</p>
          </div>
        )}

        {difficulty.reasoning && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">{t("reading.difficulty.reasoning")}</p>
            <p className="text-xs line-clamp-3">{difficulty.reasoning.overallAssessment}</p>
          </div>
        )}
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
  const { analyzeTextDifficultyAI } = useReadingAssistant();

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = React.useState(false);
  const [aiOriginalDifficulty, setAIOriginalDifficulty] = React.useState<AIDifficultyResult | null>(null);
  const [aiAdaptedDifficulty, setAIAdaptedDifficulty] = React.useState<AIDifficultyResult | null>(null);
  const [aiSimplifiedDifficulty, setAISimplifiedDifficulty] = React.useState<AIDifficultyResult | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = React.useState(false);

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

  const handleAIAnalyze = async () => {
    setIsAIAnalyzing(true);
    setShowAIAnalysis(true);
    try {
      if (extractedText) {
        const result = await analyzeTextDifficultyAI(extractedText);
        if (result) setAIOriginalDifficulty(result);
      }
      if (adaptedText) {
        const result = await analyzeTextDifficultyAI(adaptedText);
        if (result) setAIAdaptedDifficulty(result);
      }
      if (simplifiedText) {
        const result = await analyzeTextDifficultyAI(simplifiedText);
        if (result) setAISimplifiedDifficulty(result);
      }
    } finally {
      setIsAIAnalyzing(false);
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
        <div className="flex items-center gap-2">
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
          <Button
            onClick={handleAIAnalyze}
            disabled={!hasAnyText || isAIAnalyzing}
            size="sm"
            variant="default"
          >
            {isAIAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                <span>{t("reading.difficulty.aiAnalyzing")}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                <span>{t("reading.difficulty.aiAnalyze")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {!showAIAnalysis ? (
        <>
          <div className="flex flex-col md:flex-row gap-4">
            <AlgorithmicDifficultyCard
              title={t("reading.difficulty.original")}
              text={extractedText}
              difficulty={originalDifficulty}
              isAnalyzing={isAnalyzing}
            />
            <AlgorithmicDifficultyCard
              title={t("reading.difficulty.adapted")}
              text={adaptedText}
              difficulty={adaptedDifficulty}
              isAnalyzing={isAnalyzing}
            />
            <AlgorithmicDifficultyCard
              title={t("reading.difficulty.simplified")}
              text={simplifiedText}
              difficulty={simplifiedDifficulty}
              isAnalyzing={isAnalyzing}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {t("reading.difficulty.disclaimer")}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4">
            <AIDifficultyCard
              title={t("reading.difficulty.original")}
              text={extractedText}
              difficulty={aiOriginalDifficulty}
              isAnalyzing={isAIAnalyzing}
            />
            <AIDifficultyCard
              title={t("reading.difficulty.adapted")}
              text={adaptedText}
              difficulty={aiAdaptedDifficulty}
              isAnalyzing={isAIAnalyzing}
            />
            <AIDifficultyCard
              title={t("reading.difficulty.simplified")}
              text={simplifiedText}
              difficulty={aiSimplifiedDifficulty}
              isAnalyzing={isAIAnalyzing}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {t("reading.difficulty.aiDisclaimer")}
          </p>

          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIAnalysis(false)}
            >
              {t("reading.difficulty.showAlgorithmic")}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

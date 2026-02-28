import cefrAnalyzer, { calculateComplexityScore } from "cefr-analyzer";
import { flesch } from "flesch";
import { fleschKincaid } from "flesch-kincaid";
import { automatedReadability } from "automated-readability";
import { colemanLiau } from "coleman-liau";
import { smogFormula } from "smog-formula";
import { syllable } from "syllable";

export interface CefrWordHighlight {
  word: string;
  lemma: string;
  level: CEFRLevel;
}

export interface CefrHighlightResult {
  wordMap: Map<string, CEFRLevel>;
  highlights: CefrWordHighlight[];
  distribution: Record<CEFRLevel, number>;
}

export function getCefrWordHighlights(text: string): CefrHighlightResult | null {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const result = cefrAnalyzer.analyze(text, { includeUnknownWords: false });
    const wordMap = new Map<string, CEFRLevel>();
    const highlights: CefrWordHighlight[] = [];
    const distribution: Record<CEFRLevel, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };

    const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

    for (const level of levels) {
      const lowerLevel = level.toLowerCase() as Lowercase<CEFRLevel>;
      const wordsAtLevel = result.wordsAtLevel[lowerLevel] || [];
      distribution[level] = wordsAtLevel.length;

      for (const wordInfo of wordsAtLevel) {
        const lowerWord = wordInfo.word.toLowerCase();
        if (!wordMap.has(lowerWord)) {
          wordMap.set(lowerWord, level);
          highlights.push({
            word: wordInfo.word,
            lemma: wordInfo.lemma,
            level,
          });
        }
      }
    }

    return { wordMap, highlights, distribution };
  } catch (e) {
    console.warn("CEFR word highlight analysis failed:", e);
    return null;
  }
}

export function getCefrHighlightColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "bg-cyan-200 dark:bg-cyan-800",
    A2: "bg-green-200 dark:bg-green-800",
    B1: "bg-amber-200 dark:bg-amber-800",
    B2: "bg-orange-200 dark:bg-orange-800",
    C1: "bg-red-200 dark:bg-red-800",
    C2: "bg-purple-200 dark:bg-purple-800",
  };
  return colors[level] || "";
}

export function getCefrUnderlineColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "border-b-2 border-cyan-500",
    A2: "border-b-2 border-green-500",
    B1: "border-b-2 border-amber-500",
    B2: "border-b-2 border-orange-500",
    C1: "border-b-2 border-red-500",
    C2: "border-b-2 border-purple-500",
  };
  return colors[level] || "";
}

export function analyzeTextDifficulty(text: string): TextDifficultyResult | null {
  if (!text || !text.trim()) {
    return null;
  }

  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllableCount = words.reduce((sum, word) => sum + syllable(word), 0);
  const letterCount = words.join("").length;

  if (words.length === 0 || sentences.length === 0) {
    return null;
  }

  const counts = {
    word: words.length,
    sentence: sentences.length,
    syllable: syllableCount,
    character: text.replace(/\s/g, "").length,
    letter: letterCount,
  };

  const avgSentenceLength = counts.word / counts.sentence;
  const avgWordLength = counts.letter / counts.word;

  let fleschReadingEase = 0;
  let fleschKincaidGrade = 0;
  let ari = 0;
  let colemanLiauIndex = 0;
  let smogIndex = 0;

  try {
    fleschReadingEase = flesch(counts);
  } catch {
    fleschReadingEase = 0;
  }

  try {
    fleschKincaidGrade = fleschKincaid(counts);
  } catch {
    fleschKincaidGrade = 0;
  }

  try {
    ari = automatedReadability(counts);
  } catch {
    ari = 0;
  }

  try {
    colemanLiauIndex = colemanLiau(counts);
  } catch {
    colemanLiauIndex = 0;
  }

  try {
    smogIndex = smogFormula(counts);
  } catch {
    smogIndex = 0;
  }

  let cefrLevel: CEFRLevel = "B1";
  let cefrScore = 3;
  const cefrDistribution: Record<string, number> = {
    a1: 0,
    a2: 0,
    b1: 0,
    b2: 0,
    c1: 0,
    c2: 0,
  };

  try {
    const cefrResult = cefrAnalyzer.analyze(text, { includeUnknownWords: false });
    const complexityResult = calculateComplexityScore(cefrResult);
    cefrLevel = complexityResult.level.toUpperCase() as CEFRLevel;
    cefrScore = complexityResult.score;
    cefrDistribution.a1 = cefrResult.levelPercentages.a1 || 0;
    cefrDistribution.a2 = cefrResult.levelPercentages.a2 || 0;
    cefrDistribution.b1 = cefrResult.levelPercentages.b1 || 0;
    cefrDistribution.b2 = cefrResult.levelPercentages.b2 || 0;
    cefrDistribution.c1 = cefrResult.levelPercentages.c1 || 0;
    cefrDistribution.c2 = cefrResult.levelPercentages.c2 || 0;
  } catch (e) {
    console.warn("CEFR analysis failed:", e);
  }

  const validGrades = [fleschKincaidGrade, ari, colemanLiauIndex].filter(
    (g) => g > 0 && g < 20
  );
  const avgGrade =
    validGrades.length > 0
      ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
      : 5;

  const lexileMin = Math.round(Math.max(200, (avgGrade + 3) * 100));
  const lexileMax = Math.round(Math.min(1700, (avgGrade + 5) * 100));
  const estimatedLexile =
    lexileMin === lexileMax ? `${lexileMin}L` : `${lexileMin}L-${lexileMax}L`;

  return {
    wordCount: counts.word,
    sentenceCount: counts.sentence,
    syllableCount: counts.syllable,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    automatedReadabilityIndex: Math.round(ari * 10) / 10,
    colemanLiauIndex: Math.round(colemanLiauIndex * 10) / 10,
    smogIndex: Math.round(smogIndex * 10) / 10,
    cefrLevel,
    cefrScore: Math.round(cefrScore * 100) / 100,
    cefrDistribution,
    estimatedLexile,
    analyzedAt: Date.now(),
  };
}

export function getCefrColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "bg-green-500 text-white",
    A2: "bg-lime-500 text-white",
    B1: "bg-yellow-500 text-white",
    B2: "bg-orange-500 text-white",
    C1: "bg-red-500 text-white",
    C2: "bg-purple-500 text-white",
  };
  return colors[level] || colors.B1;
}

export function getCefrBadgeColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    A2: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    B1: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    B2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    C1: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    C2: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[level] || colors.B1;
}

export function getFleschDescription(score: number): string {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (College)";
  return "Very Difficult (Graduate)";
}

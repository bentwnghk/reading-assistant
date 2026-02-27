import cefrAnalyzer, { calculateComplexityScore } from "cefr-analyzer";
import { flesch } from "flesch";
import { fleschKincaid } from "flesch-kincaid";
import { automatedReadability } from "automated-readability";
import { colemanLiau } from "coleman-liau";
import { smogFormula } from "smog-formula";
import { syllable } from "syllable";

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
    A1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    A2: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
    B1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
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

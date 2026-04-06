import type { ReadingHistory } from "@/store/history";

export interface SessionScore {
  title: string;
  score: number;
  date: number;
}

export interface WeeklyCount {
  week: string;
  count: number;
}

export interface VocabularyPoint {
  label: string;
  cumulative: number;
  session: number;
  date: number;
}

export interface ScoreBucket {
  range: string;
  count: number;
  fill: string;
}

export interface DashboardMetrics {
  totalSessions: number;
  sessionsBySource: { upload: number; repository: number };
  progressPerSession: { id: string; title: string; progress: number; date: number }[];
  averageProgress: number;
  summariesGenerated: number;
  mindMapsGenerated: number;
  mindMapsChinese: number;
  mindMapsEnglish: number;
  adaptedTextsGenerated: number;
  simplifiedTextsGenerated: number;
  totalSentencesAnalyzed: number;
  totalVocabulary: number;
  totalTutorQuestions: number;
  spellingScores: SessionScore[];
  quizScores: SessionScore[];
  testScores: SessionScore[];
  sessionsOverTime: WeeklyCount[];
  vocabularyOverTime: VocabularyPoint[];
  scoreDistribution: ScoreBucket[];
}

function getSessionTitle(item: ReadingHistory): string {
  return item.docTitle || item.extractedText?.slice(0, 50) || "Untitled";
}

function calculateProgress(item: ReadingHistory): number {
  const hasExtractedText = !!item.extractedText;
  const steps = [
    hasExtractedText,
    !!item.summary,
    !!item.mindMap,
    !!item.adaptedText,
    item.testCompleted,
    Object.keys(item.analyzedSentences || {}).length > 0,
    (item.highlightedWords || []).length > 0,
    (item.glossary || []).length > 0,
    (item.spellingGameBestScore || 0) > 0,
    (item.vocabularyQuizScore || 0) > 0,
  ];
  const completedCount = steps.filter(Boolean).length;
  return Math.round((completedCount / steps.length) * 100);
}

function detectMindMapLanguage(mermaidCode: string): "zh" | "en" {
  return /[\u4e00-\u9fff]/.test(mermaidCode) ? "zh" : "en";
}

function getWeekKey(timestamp: number): string {
  const date = new Date(timestamp);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function computeDashboardMetrics(history: ReadingHistory[]): DashboardMetrics {
  if (history.length === 0) {
    return {
      totalSessions: 0,
      sessionsBySource: { upload: 0, repository: 0 },
      progressPerSession: [],
      averageProgress: 0,
      summariesGenerated: 0,
      mindMapsGenerated: 0,
      mindMapsChinese: 0,
      mindMapsEnglish: 0,
      adaptedTextsGenerated: 0,
      simplifiedTextsGenerated: 0,
      totalSentencesAnalyzed: 0,
      totalVocabulary: 0,
      totalTutorQuestions: 0,
      spellingScores: [],
      quizScores: [],
      testScores: [],
      sessionsOverTime: [],
      vocabularyOverTime: [],
      scoreDistribution: [],
    };
  }

  const sorted = [...history].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const uploadCount = sorted.filter((h) => h.source === "upload").length;
  const repositoryCount = sorted.length - uploadCount;

  const progressPerSession = sorted.map((item) => ({
    id: item.id,
    title: getSessionTitle(item),
    progress: calculateProgress(item),
    date: item.updatedAt || item.createdAt,
  }));

  const averageProgress = Math.round(
    progressPerSession.reduce((sum, p) => sum + p.progress, 0) / progressPerSession.length
  );

  const summariesGenerated = sorted.filter((h) => !!h.summary).length;

  const mindMaps = sorted.filter((h) => !!h.mindMap);
  const mindMapsGenerated = mindMaps.length;
  const mindMapsChinese = mindMaps.filter((h) => detectMindMapLanguage(h.mindMap!) === "zh").length;
  const mindMapsEnglish = mindMapsGenerated - mindMapsChinese;

  const adaptedTextsGenerated = sorted.filter((h) => !!h.adaptedText).length;
  const simplifiedTextsGenerated = sorted.filter((h) => !!h.simplifiedText).length;

  const totalSentencesAnalyzed = sorted.reduce(
    (sum, item) => sum + Object.keys(item.analyzedSentences || {}).length,
    0
  );

  const totalVocabulary = sorted.reduce(
    (sum, item) => sum + (item.glossary?.length || 0),
    0
  );

  const totalTutorQuestions = sorted.reduce(
    (sum, item) =>
      sum + (item.chatHistory || []).filter((m) => m.role === "user").length,
    0
  );

  const spellingScores: SessionScore[] = sorted
    .filter((h) => (h.spellingGameBestScore || 0) > 0)
    .map((h) => ({
      title: getSessionTitle(h),
      score: h.spellingGameBestScore!,
      date: h.updatedAt || h.createdAt,
    }));

  const quizScores: SessionScore[] = sorted
    .filter((h) => (h.vocabularyQuizScore || 0) > 0)
    .map((h) => ({
      title: getSessionTitle(h),
      score: h.vocabularyQuizScore!,
      date: h.updatedAt || h.createdAt,
    }));

  const testScores: SessionScore[] = sorted
    .filter((h) => h.testCompleted && (h.testScore ?? 0) > 0)
    .map((h) => ({
      title: getSessionTitle(h),
      score: h.testScore!,
      date: h.updatedAt || h.createdAt,
    }));

  const weekMap = new Map<string, number>();
  for (const item of sorted) {
    const week = getWeekKey(item.createdAt);
    weekMap.set(week, (weekMap.get(week) || 0) + 1);
  }
  const sessionsOverTime: WeeklyCount[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  let cumulativeVocab = 0;
  const vocabularyOverTime: VocabularyPoint[] = sorted.map((item) => {
    cumulativeVocab += item.glossary?.length || 0;
    return {
      label: getSessionTitle(item).slice(0, 20),
      cumulative: cumulativeVocab,
      session: item.glossary?.length || 0,
      date: item.createdAt,
    };
  });

  const scoreBuckets = [
    { range: "0-40", min: 0, max: 40, fill: "hsl(var(--destructive))" },
    { range: "41-60", min: 41, max: 60, fill: "hsl(var(--chart-4, 249 115 22))" },
    { range: "61-80", min: 61, max: 80, fill: "hsl(var(--chart-2, 132 204 22))" },
    { range: "81-100", min: 81, max: 100, fill: "hsl(var(--chart-1, 59 130 246))" },
  ];

  const scoreDistribution: ScoreBucket[] = scoreBuckets.map((bucket) => ({
    range: bucket.range,
    count: testScores.filter(
      (s) => s.score >= bucket.min && s.score <= bucket.max
    ).length,
    fill: bucket.fill,
  }));

  return {
    totalSessions: sorted.length,
    sessionsBySource: { upload: uploadCount, repository: repositoryCount },
    progressPerSession,
    averageProgress,
    summariesGenerated,
    mindMapsGenerated,
    mindMapsChinese,
    mindMapsEnglish,
    adaptedTextsGenerated,
    simplifiedTextsGenerated,
    totalSentencesAnalyzed,
    totalVocabulary,
    totalTutorQuestions,
    spellingScores,
    quizScores,
    testScores,
    sessionsOverTime,
    vocabularyOverTime,
    scoreDistribution,
  };
}

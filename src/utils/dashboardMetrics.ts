import type { ReadingHistory } from "@/store/history";

export interface SessionScore {
  title: string;
  score: number;
  date: number;
  accuracy?: number;
}

export interface WeeklyCount {
  weekStart: string;
  count: number;
}

export interface VocabularyPoint {
  date: string;
  cumulative: number;
  daily: number;
}

export interface ScoreBucket {
  range: string;
  count: number;
  fill: string;
}

export interface DailyActivity {
  date: string;
  readText: number;
  summary: number;
  mindMap: number;
  adaptedText: number;
  simplifiedText: number;
  sentenceAnalysis: number;
  glossary: number;
  spellingGame: number;
  vocabQuiz: number;
  readingTest: number;
  grammarQuiz: number;
  grammarGame: number;
  tutorQuestion: number;
  flashcardReview: number;
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
  glossariesGenerated: number;
  grammarAnalysisGenerated: number;
  totalVocabulary: number;
  totalTutorQuestions: number;
  totalFlashcardReviews: number;
  spellingScores: SessionScore[];
  quizScores: SessionScore[];
  testScores: SessionScore[];
  grammarQuizScores: SessionScore[];
  grammarGameScores: SessionScore[];
  sessionsOverTime: WeeklyCount[];
  scoreDistribution: ScoreBucket[];
  dailyActivities: DailyActivity[];
}

export const DAILY_ACTIVITY_KEYS = [
  "readText",
  "summary",
  "mindMap",
  "adaptedText",
  "simplifiedText",
  "sentenceAnalysis",
  "glossary",
  "flashcardReview",
  "spellingGame",
  "vocabQuiz",
  "readingTest",
  "grammarQuiz",
  "grammarGame",
  "tutorQuestion",
] as const;

export const DAILY_ACTIVITY_COLORS: Record<string, string> = {
  readText: "#3b82f6",
  summary: "#6366f1",
  mindMap: "#8b5cf6",
  adaptedText: "#22c55e",
  simplifiedText: "#14b8a6",
  sentenceAnalysis: "#f97316",
  glossary: "#eab308",
  spellingGame: "#ec4899",
  vocabQuiz: "#06b6d4",
  readingTest: "#ef4444",
  grammarQuiz: "#d946ef",
  grammarGame: "#84cc16",
  tutorQuestion: "#a855f7",
  flashcardReview: "#f59e0b",
};

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
    item.grammarQuizCompleted && (item.grammarQuizScore || 0) > 0,
  ];
  const completedCount = steps.filter(Boolean).length;
  return Math.round((completedCount / steps.length) * 100);
}

function detectMindMapLanguage(mermaidCode: string): "zh" | "en" {
  return /[\u4e00-\u9fff]/.test(mermaidCode) ? "zh" : "en";
}

function toDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function emptyDailyActivity(date: string): DailyActivity {
  return {
    date,
    readText: 0,
    summary: 0,
    mindMap: 0,
    adaptedText: 0,
    simplifiedText: 0,
    sentenceAnalysis: 0,
    glossary: 0,
    spellingGame: 0,
    vocabQuiz: 0,
    readingTest: 0,
    grammarQuiz: 0,
    grammarGame: 0,
    tutorQuestion: 0,
    flashcardReview: 0,
  };
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
      glossariesGenerated: 0,
      grammarAnalysisGenerated: 0,
      totalVocabulary: 0,
      totalTutorQuestions: 0,
      totalFlashcardReviews: 0,
      spellingScores: [],
      quizScores: [],
      testScores: [],
      grammarQuizScores: [],
      grammarGameScores: [],
      sessionsOverTime: [],
      scoreDistribution: [],
      dailyActivities: [],
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
  const glossariesGenerated = sorted.filter((h) => (h.glossary || []).length > 0).length;

  const grammarAnalysisGenerated = sorted.filter((h) => (h.grammarTopics || []).length > 0).length;

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

  const totalFlashcardReviews = sorted.reduce(
    (sum, item) => sum + (item.flashcardReviewDates || []).length,
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

  const grammarQuizScores: SessionScore[] = sorted
    .filter((h) => h.grammarQuizCompleted && (h.grammarQuizScore || 0) > 0)
    .map((h) => ({
      title: getSessionTitle(h),
      score: h.grammarQuizScore!,
      date: h.updatedAt || h.createdAt,
    }));

  const grammarGameScores: SessionScore[] = sorted
    .filter((h) => {
      const best = Math.max(
        h.grammarScrambleHighScore || 0,
        h.grammarWorkshopHighScore || 0,
        h.grammarSurgeryHighScore || 0,
        h.grammarRouletteHighScore || 0,
        h.grammarDuelHighScore || 0,
      );
      return best > 0;
    })
    .map((h) => ({
      title: getSessionTitle(h),
      score: Math.max(
        h.grammarScrambleHighScore || 0,
        h.grammarWorkshopHighScore || 0,
        h.grammarSurgeryHighScore || 0,
        h.grammarRouletteHighScore || 0,
        h.grammarDuelHighScore || 0,
      ),
      accuracy: h.grammarGameAccuracy || 0,
      date: h.updatedAt || h.createdAt,
    }));

  const weekMap = new Map<string, number>();
  for (const item of sorted) {
    const weekKey = getMondayKey(item.createdAt);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  }
  const sessionsOverTime: WeeklyCount[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count }));

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

  // Helper: get or create a DailyActivity row for a given date string
  function getDay(map: Map<string, DailyActivity>, date: string): DailyActivity {
    if (!map.has(date)) map.set(date, emptyDailyActivity(date));
    return map.get(date)!;
  }

  const dailyMap = new Map<string, DailyActivity>();
  for (const item of sorted) {
    // readText — date the session was started (reading IS the session)
    getDay(dailyMap, toDateString(item.createdAt)).readText += 1;

    // single-completion activities — use their own *At timestamp, fall back to createdAt
    if (item.summary) {
      getDay(dailyMap, toDateString(item.summaryGeneratedAt || item.createdAt)).summary += 1;
    }
    if (item.mindMap) {
      getDay(dailyMap, toDateString(item.mindMapGeneratedAt || item.createdAt)).mindMap += 1;
    }
    if (item.adaptedText) {
      getDay(dailyMap, toDateString(item.adaptedTextGeneratedAt || item.createdAt)).adaptedText += 1;
    }
    if (item.simplifiedText) {
      getDay(dailyMap, toDateString(item.simplifiedTextGeneratedAt || item.createdAt)).simplifiedText += 1;
    }
    if ((item.glossary || []).length > 0) {
      getDay(dailyMap, toDateString(item.glossaryGeneratedAt || item.createdAt)).glossary += 1;
    }
    if ((item.spellingGameBestScore || 0) > 0) {
      getDay(dailyMap, toDateString(item.spellingGameCompletedAt || item.createdAt)).spellingGame += 1;
    }
    if ((item.vocabularyQuizScore || 0) > 0) {
      getDay(dailyMap, toDateString(item.vocabQuizCompletedAt || item.createdAt)).vocabQuiz += 1;
    }
    if (item.testCompleted) {
      getDay(dailyMap, toDateString(item.readingTestCompletedAt || item.createdAt)).readingTest += 1;
    }
    if (item.grammarQuizCompleted && (item.grammarQuizScore || 0) > 0) {
      getDay(dailyMap, toDateString(item.grammarQuizCompletedAt || item.createdAt)).grammarQuiz += 1;
    }

    const grammarGameBest = Math.max(
      item.grammarScrambleHighScore || 0,
      item.grammarWorkshopHighScore || 0,
      item.grammarSurgeryHighScore || 0,
      item.grammarRouletteHighScore || 0,
      item.grammarDuelHighScore || 0,
    );
    if (grammarGameBest > 0) {
      getDay(dailyMap, toDateString(item.grammarGameCompletedAt || item.updatedAt || item.createdAt)).grammarGame += 1;
    }

    // sentenceAnalysis — each entry has its own createdAt
    for (const entry of Object.values(item.analyzedSentences || {})) {
      getDay(dailyMap, toDateString((entry as { createdAt?: number }).createdAt || item.createdAt)).sentenceAnalysis += 1;
    }

    // tutorQuestion — each ChatMessage has its own timestamp
    for (const msg of (item.chatHistory || []).filter((m) => m.role === "user")) {
      getDay(dailyMap, toDateString(msg.timestamp || item.createdAt)).tutorQuestion += 1;
    }

    // flashcardReview — array of completion timestamps
    for (const ts of (item.flashcardReviewDates || [])) {
      getDay(dailyMap, toDateString(ts)).flashcardReview += 1;
    }
  }
  const dailyActivities = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

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
    glossariesGenerated,
    grammarAnalysisGenerated,
    totalVocabulary,
    totalTutorQuestions,
    totalFlashcardReviews,
    spellingScores,
    quizScores,
    testScores,
    grammarQuizScores,
    grammarGameScores,
    sessionsOverTime,
    scoreDistribution,
    dailyActivities,
  };
}

export function computeVocabularyOverTime(history: ReadingHistory[], days: number): VocabularyPoint[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = toDateString(cutoff.getTime());

  const sorted = [...history]
    .filter((h) => (h.glossary || []).length > 0)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const dailyMap = new Map<string, number>();
  for (const item of sorted) {
    const dateKey = toDateString(item.createdAt);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + (item.glossary || []).length);
  }

  const startDate = new Date(cutoffStr + "T00:00:00");
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result: VocabularyPoint[] = [];
  let cumulative = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateKey = toDateString(current.getTime());
    const daily = dailyMap.get(dateKey) || 0;
    cumulative += daily;
    result.push({ date: dateKey, cumulative, daily });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

import type { TeacherSessionData } from "@/lib/users";

export interface StudentMetrics {
  userId: string;
  userName: string;
  totalReadingTexts: number;
  readingTextsByPeriod: Record<string, number>;
  totalVocabulary: number;
  vocabularyTimeline: Array<{ date: string; cumulative: number }>;
  avgProgress: number;
  aiUsage: {
    summary: number;
    mindMap: number;
    visualization: number;
    adaptedText: number;
    simplifiedText: number;
    sentenceAnalysis: number;
    glossary: number;
    grammar: number;
    tutorQuestion: number;
  };
  testScores: number[];
  quizScores: number[];
  spellingScores: number[];
  grammarQuizScores: number[];
  grammarGameScores: number[];
  grammarGameAccuracies: number[];
  dailyActivities: Map<string, DailyStudentActivity>;
}

export interface DailyStudentActivity {
  date: string;
  readText: number;
  summary: number;
  mindMap: number;
  visualization: number;
  adaptedText: number;
  simplifiedText: number;
  sentenceAnalysis: number;
  glossary: number;
  flashcardReview: number;
  spellingGame: number;
  vocabQuiz: number;
  readingTest: number;
  grammarQuiz: number;
  grammarGame: number;
  tutorQuestion: number;
}

export interface TeacherDashboardMetrics {
  students: StudentMetrics[];
  dailyActivityDates: string[];
  classTotalReadingTexts: number;
  classAvgReadingTexts: number;
  classTotalVocabulary: number;
  classAvgVocabulary: number;
  classAvgProgress: number;
  classAvgTestScore: number;
  classAvgQuizScore: number;
  classAvgSpellingScore: number;
  classAvgGrammarQuizScore: number;
  classAvgGrammarGameScore: number;
  classAvgGrammarGameAccuracy: number;
  classTotalAiUsage: StudentMetrics["aiUsage"];
  classAvgAiUsage: StudentMetrics["aiUsage"];
}

export const DAILY_ACTIVITY_KEYS = [
  "readText",
  "summary",
  "mindMap",
  "visualization",
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
  visualization: "#0ea5e9",
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

export const READING_TEXT_PERIODS = [
  { key: "all", days: Infinity, labelKey: "teacherDashboard.readingTexts.all" },
  { key: "1w", days: 7, labelKey: "teacherDashboard.readingTexts.1w" },
  { key: "2w", days: 14, labelKey: "teacherDashboard.readingTexts.2w" },
  { key: "1m", days: 30, labelKey: "teacherDashboard.readingTexts.1m" },
  { key: "2m", days: 60, labelKey: "teacherDashboard.readingTexts.2m" },
  { key: "3m", days: 90, labelKey: "teacherDashboard.readingTexts.3m" },
  { key: "6m", days: 180, labelKey: "teacherDashboard.readingTexts.6m" },
  { key: "9m", days: 270, labelKey: "teacherDashboard.readingTexts.9m" },
  { key: "1y", days: 365, labelKey: "teacherDashboard.readingTexts.1y" },
] as const;

export const VOCAB_TIME_RANGES = [
  { days: 7, labelKey: "dashboard.timeRanges.w1" },
  { days: 14, labelKey: "dashboard.timeRanges.w2" },
  { days: 21, labelKey: "dashboard.timeRanges.w3" },
  { days: 30, labelKey: "dashboard.timeRanges.m1" },
  { days: 60, labelKey: "dashboard.timeRanges.m2" },
  { days: 90, labelKey: "dashboard.timeRanges.m3" },
  { days: 120, labelKey: "dashboard.timeRanges.m4" },
  { days: 150, labelKey: "dashboard.timeRanges.m5" },
  { days: 180, labelKey: "dashboard.timeRanges.m6" },
  { days: 270, labelKey: "dashboard.timeRanges.m9" },
  { days: 365, labelKey: "dashboard.timeRanges.y1" },
  { days: 730, labelKey: "dashboard.timeRanges.y2" },
  { days: 1095, labelKey: "dashboard.timeRanges.y3" },
] as const;

export const SCORE_BUCKETS = [
  { range: "0-25%", min: 0, max: 25, fill: "#ef4444" },
  { range: "26-50%", min: 26, max: 50, fill: "#f97316" },
  { range: "51-75%", min: 51, max: 75, fill: "#22c55e" },
  { range: "76-100%", min: 76, max: 100, fill: "#3b82f6" },
] as const;

export const SPELLING_BUCKETS = [
  { range: "0-40", min: 0, max: 40, fill: "#ef4444" },
  { range: "41-60", min: 41, max: 60, fill: "#f97316" },
  { range: "61-80", min: 61, max: 80, fill: "#22c55e" },
  { range: "81-100", min: 81, max: 100, fill: "#3b82f6" },
] as const;

export const QUARTILE_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6"] as const;

export function getQuartileColor(values: number[]): string[] {
  if (values.length === 0) return [];
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const result = new Array(values.length);
  for (let i = 0; i < sorted.length; i++) {
    result[sorted[i].i] = QUARTILE_COLORS[Math.min(3, Math.floor((i * 4) / sorted.length))];
  }
  return result;
}

export const AI_USAGE_KEYS = [
  "summary",
  "mindMap",
  "visualization",
  "adaptedText",
  "simplifiedText",
  "sentenceAnalysis",
  "glossary",
  "grammar",
  "tutorQuestion",
] as const;

export const AI_USAGE_COLORS: Record<string, string> = {
  summary: "#3b82f6",
  mindMap: "#8b5cf6",
  visualization: "#0ea5e9",
  adaptedText: "#22c55e",
  simplifiedText: "#14b8a6",
  sentenceAnalysis: "#f97316",
  glossary: "#eab308",
  grammar: "#d946ef",
  tutorQuestion: "#a855f7",
};

function toDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyDailyActivity(date: string): DailyStudentActivity {
  return {
    date,
    readText: 0,
    summary: 0,
    mindMap: 0,
    visualization: 0,
    adaptedText: 0,
    simplifiedText: 0,
    sentenceAnalysis: 0,
    glossary: 0,
    flashcardReview: 0,
    spellingGame: 0,
    vocabQuiz: 0,
    readingTest: 0,
    grammarQuiz: 0,
    grammarGame: 0,
    tutorQuestion: 0,
  };
}

function computeStudentMetrics(sessions: TeacherSessionData[]): StudentMetrics {
  if (sessions.length === 0) {
    return {
      userId: "",
      userName: "",
      totalReadingTexts: 0,
      readingTextsByPeriod: {},
      totalVocabulary: 0,
      vocabularyTimeline: [],
      avgProgress: 0,
      aiUsage: { summary: 0, mindMap: 0, visualization: 0, adaptedText: 0, simplifiedText: 0, sentenceAnalysis: 0, glossary: 0, grammar: 0, tutorQuestion: 0 },
      testScores: [],
      quizScores: [],
      spellingScores: [],
      grammarQuizScores: [],
      grammarGameScores: [],
      grammarGameAccuracies: [],
      dailyActivities: new Map(),
    };
  }

  const sorted = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  const userId = sorted[0].userId;
  const userName = sorted[0].userName || userId;

  const totalReadingTexts = sorted.length;
  const now = Date.now();
  const readingTextsByPeriod: Record<string, number> = {};
  for (const period of READING_TEXT_PERIODS) {
    if (period.days === Infinity) {
      readingTextsByPeriod[period.key] = totalReadingTexts;
    } else {
      const cutoff = now - period.days * 86400000;
      readingTextsByPeriod[period.key] = sorted.filter((s) => s.createdAt >= cutoff).length;
    }
  }

  const totalVocabulary = sorted.reduce((sum, s) => sum + s.glossaryCount, 0);

  const vocabDailyMap = new Map<string, number>();
  for (const item of sorted) {
    if (item.glossaryCount > 0) {
      const dateKey = toDateString(item.createdAt);
      vocabDailyMap.set(dateKey, (vocabDailyMap.get(dateKey) || 0) + item.glossaryCount);
    }
  }
  const allDates = [...vocabDailyMap.keys()].sort();
  const vocabularyTimeline: Array<{ date: string; cumulative: number }> = [];
  let cumulative = 0;
  for (const date of allDates) {
    cumulative += vocabDailyMap.get(date) || 0;
    vocabularyTimeline.push({ date, cumulative });
  }

  const avgProgress = Math.round(sorted.reduce((sum, s) => sum + s.progress, 0) / sorted.length);

  const aiUsage = {
    summary: sorted.filter((s) => s.summary).length,
    mindMap: sorted.filter((s) => s.mindMap).length,
    visualization: sorted.filter((s) => s.visualization).length,
    adaptedText: sorted.filter((s) => s.adaptedText).length,
    simplifiedText: sorted.filter((s) => s.simplifiedText).length,
    sentenceAnalysis: sorted.reduce((sum, s) => sum + s.sentenceAnalysisCount, 0),
    glossary: sorted.filter((s) => s.glossaryCount > 0).length,
    grammar: sorted.filter((s) => s.grammarAnalysisCount > 0).length,
    tutorQuestion: sorted.reduce((sum, s) => sum + s.tutorQuestionCount, 0),
  };

  const testScores = sorted.filter((s) => s.testCompleted && s.testScore != null && s.testScore > 0).map((s) => s.testScore!);
  const quizScores = sorted.filter((s) => s.vocabularyQuizScore != null && s.vocabularyQuizScore > 0).map((s) => s.vocabularyQuizScore!);
  const spellingScores = sorted.filter((s) => s.spellingGameBestScore != null && s.spellingGameBestScore > 0).map((s) => s.spellingGameBestScore!);
  const grammarQuizScores = sorted.filter((s) => s.grammarQuizCompleted && s.grammarQuizScore != null && s.grammarQuizScore > 0).map((s) => s.grammarQuizScore!);
  const grammarGameScores = sorted.filter((s) => s.grammarGameBestScore != null && s.grammarGameBestScore > 0).map((s) => s.grammarGameBestScore!);
  const grammarGameAccuracies = sorted.filter((s) => s.grammarGameAccuracy != null && s.grammarGameAccuracy > 0).map((s) => s.grammarGameAccuracy!);

  const dailyMap = new Map<string, DailyStudentActivity>();
  function getDay(date: string): DailyStudentActivity {
    if (!dailyMap.has(date)) dailyMap.set(date, emptyDailyActivity(date));
    return dailyMap.get(date)!;
  }

  for (const item of sorted) {
    getDay(toDateString(item.createdAt)).readText += 1;
    if (item.summary && item.summaryGeneratedAt) {
      getDay(toDateString(item.summaryGeneratedAt)).summary += 1;
    }
    if (item.mindMap && item.mindMapGeneratedAt) {
      getDay(toDateString(item.mindMapGeneratedAt)).mindMap += 1;
    }
    if (item.visualization && item.visualizationGeneratedAt) {
      getDay(toDateString(item.visualizationGeneratedAt)).visualization += 1;
    }
    if (item.adaptedText && item.adaptedTextGeneratedAt) {
      getDay(toDateString(item.adaptedTextGeneratedAt)).adaptedText += 1;
    }
    if (item.simplifiedText && item.simplifiedTextGeneratedAt) {
      getDay(toDateString(item.simplifiedTextGeneratedAt)).simplifiedText += 1;
    }
    if (item.glossaryCount > 0 && item.glossaryGeneratedAt) {
      getDay(toDateString(item.glossaryGeneratedAt)).glossary += 1;
    }
    if (item.spellingGameBestScore && item.spellingGameBestScore > 0 && item.spellingGameCompletedAt) {
      getDay(toDateString(item.spellingGameCompletedAt)).spellingGame += item.spellingGamesCompleted || 1;
    }
    if (item.vocabularyQuizScore && item.vocabularyQuizScore > 0 && item.vocabQuizCompletedAt) {
      getDay(toDateString(item.vocabQuizCompletedAt)).vocabQuiz += item.vocabQuizzesCompleted || 1;
    }
    if (item.testCompleted && item.readingTestCompletedAt) {
      getDay(toDateString(item.readingTestCompletedAt)).readingTest += item.testsCompleted || 1;
    }
    if (item.grammarQuizCompleted && item.grammarQuizScore && item.grammarQuizScore > 0 && item.grammarQuizCompletedAt) {
      getDay(toDateString(item.grammarQuizCompletedAt)).grammarQuiz += item.grammarQuizzesCompleted || 1;
    }
    if (item.grammarGameBestScore != null && item.grammarGameBestScore > 0) {
      getDay(toDateString(item.grammarGameCompletedAt || item.updatedAt)).grammarGame += item.grammarGamesCompleted || 1;
    }
    if (item.tutorQuestionCount > 0) {
      getDay(toDateString(item.createdAt)).tutorQuestion += item.tutorQuestionCount;
    }
    if (item.flashcardReviewCount > 0) {
      getDay(toDateString(item.createdAt)).flashcardReview += item.flashcardReviewCount;
    }
  }

  return {
    userId,
    userName,
    totalReadingTexts,
    readingTextsByPeriod,
    totalVocabulary,
    vocabularyTimeline,
    avgProgress,
    aiUsage,
    testScores,
    quizScores,
    spellingScores,
    grammarQuizScores,
    grammarGameScores,
    grammarGameAccuracies,
    dailyActivities: dailyMap,
  };
}

export function computeTeacherDashboardMetrics(sessions: TeacherSessionData[]): TeacherDashboardMetrics {
  if (sessions.length === 0) {
    return {
      students: [],
      dailyActivityDates: [],
      classTotalReadingTexts: 0,
      classAvgReadingTexts: 0,
      classTotalVocabulary: 0,
      classAvgVocabulary: 0,
      classAvgProgress: 0,
      classAvgTestScore: 0,
      classAvgQuizScore: 0,
      classAvgSpellingScore: 0,
      classAvgGrammarQuizScore: 0,
      classAvgGrammarGameScore: 0,
      classAvgGrammarGameAccuracy: 0,
      classTotalAiUsage: { summary: 0, mindMap: 0, visualization: 0, adaptedText: 0, simplifiedText: 0, sentenceAnalysis: 0, glossary: 0, grammar: 0, tutorQuestion: 0 },
      classAvgAiUsage: { summary: 0, mindMap: 0, visualization: 0, adaptedText: 0, simplifiedText: 0, sentenceAnalysis: 0, glossary: 0, grammar: 0, tutorQuestion: 0 },
    };
  }

  const grouped = new Map<string, TeacherSessionData[]>();
  for (const s of sessions) {
    if (!grouped.has(s.userId)) grouped.set(s.userId, []);
    grouped.get(s.userId)!.push(s);
  }

  const students = Array.from(grouped.values()).map(computeStudentMetrics);
  students.sort((a, b) => a.userName.localeCompare(b.userName));

  const dailyDatesSet = new Set<string>();
  for (const student of students) {
    for (const date of student.dailyActivities.keys()) {
      dailyDatesSet.add(date);
    }
  }
  const dailyActivityDates = Array.from(dailyDatesSet).sort();

  const n = students.length || 1;
  const classTotalReadingTexts = students.reduce((sum, s) => sum + s.totalReadingTexts, 0);
  const classAvgReadingTexts = Math.round(classTotalReadingTexts / n);
  const classTotalVocabulary = students.reduce((sum, s) => sum + s.totalVocabulary, 0);
  const classAvgVocabulary = Math.round(classTotalVocabulary / n);
  const classAvgProgress = Math.round(students.reduce((sum, s) => sum + s.avgProgress, 0) / n);

  const allTestScores = students.flatMap((s) => s.testScores);
  const allQuizScores = students.flatMap((s) => s.quizScores);
  const allSpellingScores = students.flatMap((s) => s.spellingScores);
  const allGrammarQuizScores = students.flatMap((s) => s.grammarQuizScores);
  const allGrammarGameScores = students.flatMap((s) => s.grammarGameScores);
  const allGrammarGameAccuracies = students.flatMap((s) => s.grammarGameAccuracies);
  const classAvgTestScore = allTestScores.length > 0 ? Math.round(allTestScores.reduce((a, b) => a + b, 0) / allTestScores.length) : 0;
  const classAvgQuizScore = allQuizScores.length > 0 ? Math.round(allQuizScores.reduce((a, b) => a + b, 0) / allQuizScores.length) : 0;
  const classAvgSpellingScore = allSpellingScores.length > 0 ? Math.round(allSpellingScores.reduce((a, b) => a + b, 0) / allSpellingScores.length) : 0;
  const classAvgGrammarQuizScore = allGrammarQuizScores.length > 0 ? Math.round(allGrammarQuizScores.reduce((a, b) => a + b, 0) / allGrammarQuizScores.length) : 0;
  const classAvgGrammarGameScore = allGrammarGameScores.length > 0 ? Math.round(allGrammarGameScores.reduce((a, b) => a + b, 0) / allGrammarGameScores.length) : 0;
  const classAvgGrammarGameAccuracy = allGrammarGameAccuracies.length > 0 ? Math.round(allGrammarGameAccuracies.reduce((a, b) => a + b, 0) / allGrammarGameAccuracies.length) : 0;

  const classTotalAiUsage = {
    summary: students.reduce((sum, s) => sum + s.aiUsage.summary, 0),
    mindMap: students.reduce((sum, s) => sum + s.aiUsage.mindMap, 0),
    visualization: students.reduce((sum, s) => sum + s.aiUsage.visualization, 0),
    adaptedText: students.reduce((sum, s) => sum + s.aiUsage.adaptedText, 0),
    simplifiedText: students.reduce((sum, s) => sum + s.aiUsage.simplifiedText, 0),
    sentenceAnalysis: students.reduce((sum, s) => sum + s.aiUsage.sentenceAnalysis, 0),
    glossary: students.reduce((sum, s) => sum + s.aiUsage.glossary, 0),
    grammar: students.reduce((sum, s) => sum + s.aiUsage.grammar, 0),
    tutorQuestion: students.reduce((sum, s) => sum + s.aiUsage.tutorQuestion, 0),
  };

  const classAvgAiUsage = {
    summary: Math.round(classTotalAiUsage.summary / n),
    mindMap: Math.round(classTotalAiUsage.mindMap / n),
    visualization: Math.round(classTotalAiUsage.visualization / n),
    adaptedText: Math.round(classTotalAiUsage.adaptedText / n),
    simplifiedText: Math.round(classTotalAiUsage.simplifiedText / n),
    sentenceAnalysis: Math.round(classTotalAiUsage.sentenceAnalysis / n),
    glossary: Math.round(classTotalAiUsage.glossary / n),
    grammar: Math.round(classTotalAiUsage.grammar / n),
    tutorQuestion: Math.round(classTotalAiUsage.tutorQuestion / n),
  };

  return {
    students,
    dailyActivityDates,
    classTotalReadingTexts,
    classAvgReadingTexts,
    classTotalVocabulary,
    classAvgVocabulary,
    classAvgProgress,
    classAvgTestScore,
    classAvgQuizScore,
    classAvgSpellingScore,
    classAvgGrammarQuizScore,
    classAvgGrammarGameScore,
    classAvgGrammarGameAccuracy,
    classTotalAiUsage,
    classAvgAiUsage,
  };
}

export function getDailyActivityForDate(
  students: StudentMetrics[],
  date: string
): Array<{ userName: string; [key: string]: string | number }> {
  return students.map((s) => {
    const activity = s.dailyActivities.get(date);
    return {
      userName: s.userName,
      readText: activity?.readText || 0,
      summary: activity?.summary || 0,
      mindMap: activity?.mindMap || 0,
      adaptedText: activity?.adaptedText || 0,
      simplifiedText: activity?.simplifiedText || 0,
      sentenceAnalysis: activity?.sentenceAnalysis || 0,
      glossary: activity?.glossary || 0,
      flashcardReview: activity?.flashcardReview || 0,
      spellingGame: activity?.spellingGame || 0,
      vocabQuiz: activity?.vocabQuiz || 0,
      readingTest: activity?.readingTest || 0,
      grammarQuiz: activity?.grammarQuiz || 0,
      grammarGame: activity?.grammarGame || 0,
      tutorQuestion: activity?.tutorQuestion || 0,
    };
  });
}

export function getVocabularyGrowthData(
  students: StudentMetrics[],
  days: number
): Array<{ date: string; [studentName: string]: string | number }> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const dateSet = new Set<string>();
  const studentCumulativeMaps = new Map<string, Map<string, number>>();

  for (const student of students) {
    const cumMap = new Map<string, number>();
    let cum = 0;
    for (const point of student.vocabularyTimeline) {
      if (point.date < cutoffStr) {
        cum = point.cumulative;
        continue;
      }
      cum = point.cumulative;
      cumMap.set(point.date, cum);
      dateSet.add(point.date);
    }
    studentCumulativeMaps.set(student.userName, cumMap);
  }

  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return [];

  const start = new Date(cutoffStr + "T00:00:00");
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: Array<{ date: string; [studentName: string]: string | number }> = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row: { date: string; [studentName: string]: string | number } = { date: dateKey };

    for (const student of students) {
      const cumMap = studentCumulativeMaps.get(student.userName);
      if (cumMap) {
        let val = 0;
        for (const [dt, v] of cumMap) {
          if (dt <= dateKey) val = v;
        }
        row[student.userName] = val;
      } else {
        row[student.userName] = 0;
      }
    }
    result.push(row);
  }

  return result;
}

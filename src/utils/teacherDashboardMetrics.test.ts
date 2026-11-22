import { describe, expect, it } from "vitest";
import type { TeacherSessionData } from "@/lib/users";
import { computeTeacherDashboardMetrics, getDailyActivityForDate } from "./teacherDashboardMetrics";

function session(userId: string, createdAt: number): TeacherSessionData {
  return {
    id: `${userId}-1`,
    userId,
    userName: userId,
    docTitle: "t",
    studentAge: 12,
    summary: false,
    adaptedText: false,
    simplifiedText: false,
    mindMap: false,
    testScore: null,
    testCompleted: false,
    vocabularyQuizScore: null,
    spellingGameBestScore: null,
    spellingGameAccuracy: null,
    testsCompleted: 0,
    vocabQuizzesCompleted: 0,
    spellingGamesCompleted: 0,
    grammarQuizScore: null,
    grammarQuizCompleted: false,
    grammarQuizzesCompleted: 0,
    grammarGameBestScore: null,
    grammarGameAccuracy: null,
    grammarGamesCompleted: 0,
    grammarGameCompletedAt: 0,
    glossaryCount: 0,
    sentenceAnalysisCount: 0,
    sentenceAnalysisTimestamps: [],
    tutorQuestionCount: 0,
    tutorQuestionTimestamps: [],
    flashcardReviewCount: 0,
    flashcardReviewTimestamps: [],
    grammarAnalysisCount: 0,
    grammarGeneratedAt: 0,
    grammarQuizCompletedAt: 0,
    progress: 0,
    createdAt,
    updatedAt: 0,
    summaryGeneratedAt: 0,
    mindMapGeneratedAt: 0,
    adaptedTextGeneratedAt: 0,
    simplifiedTextGeneratedAt: 0,
    glossaryGeneratedAt: 0,
    spellingGameCompletedAt: 0,
    vocabQuizCompletedAt: 0,
    readingTestCompletedAt: 0,
    visualization: false,
    visualizationGeneratedAt: 0,
    preReading: false,
    preReadingGeneratedAt: 0,
    collocations: false,
    collocationsGeneratedAt: 0,
  };
}

const T = Date.UTC(2026, 10, 20, 9, 0, 0);

describe("Word of the Day in the daily activity chart", () => {
  it("counts each completed day as one activity on that day, per student", () => {
    const metrics = computeTeacherDashboardMetrics(
      [session("s1", T), session("s2", T)],
      [],
      {},
      [
        { userId: "s1", dayKey: "2026-11-20" },
        { userId: "s1", dayKey: "2026-11-21" },
        { userId: "s2", dayKey: "2026-11-21" },
      ]
    );
    expect(getDailyActivityForDate(metrics.students, "2026-11-20")[0].dailyWord).toBe(1);
    expect(getDailyActivityForDate(metrics.students, "2026-11-21")[0].dailyWord).toBe(1);
    expect(getDailyActivityForDate(metrics.students, "2026-11-21")[1].dailyWord).toBe(1);
    expect(getDailyActivityForDate(metrics.students, "2026-11-22")[0].dailyWord).toBe(0);
  });

  it("adds nothing when no days are passed", () => {
    const metrics = computeTeacherDashboardMetrics([session("s1", T)], [], {}, []);
    expect(getDailyActivityForDate(metrics.students, "2026-11-20")[0].dailyWord).toBe(0);
  });
});

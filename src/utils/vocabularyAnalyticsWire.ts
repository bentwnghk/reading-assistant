import type { VocabularyActivityEventType } from "@/constants/vocabularyActivity";

/** Wire shapes of the staff vocabulary analytics. Type-only: safe on client and server. */

export interface VocabularyAnalyticsTotals {
  learners: number;
  sessions: number;
  wordsReviewed: number;
  /** Correct / reviewed over the window's review sessions (0–100). */
  accuracy: number | null;
  wordsAdded: number;
  activeDays: number;
  lastActiveAt: number | null;
}

/** Current state of the in-scope word banks (not bound to the time window). */
export interface VocabularySnapshot {
  learnersWithWords: number;
  words: number;
  phrases: number;
  mastered: number;
  newEntries: number;
  due: number;
  hard: number;
  avgMastery: number | null;
  /** Entries per mastery level 0–5. */
  levels: number[];
}

export interface VocabularyModeStat {
  mode: "flashcard" | "quiz" | "spelling";
  sessions: number;
  wordsReviewed: number;
  accuracy: number | null;
}

export interface VocabularySeriesPoint {
  bucket: string;
  sessions: number;
  wordsReviewed: number;
  wordsAdded: number;
  accuracy: number | null;
}

export interface VocabularyHardWord {
  word: string;
  attempts: number;
  wrong: number;
  learners: number;
}

export interface VocabularySessionPoint {
  at: number;
  mode: "flashcard" | "quiz" | "spelling";
  accuracy: number;
  total: number;
}

export interface VocabularyStudentRow {
  userId: string;
  userName: string;
  userEmail: string;
  words: number;
  phrases: number;
  mastered: number;
  due: number;
  hard: number;
  avgMastery: number | null;
  sessions: number;
  wordsReviewed: number;
  accuracy: number | null;
  /** Later half minus earlier half of the window's session accuracy; null with < 2 sessions. */
  trend: number | null;
  lastActiveAt: number | null;
}

export interface VocabularyAnalyticsData {
  range: number;
  timeZone: string;
  bucketUnit: "day" | "week";
  totals: VocabularyAnalyticsTotals;
  snapshot: VocabularySnapshot;
  modes: VocabularyModeStat[];
  series: VocabularySeriesPoint[];
  hardWords: VocabularyHardWord[];
  /** Every finished review session of ONE learner (progress over time); empty otherwise. */
  sessionHistory: VocabularySessionPoint[];
  students: VocabularyStudentRow[];
  studentsTotal: number;
  /** Students with a word bank or any activity in scope (+ class filter). */
  users: { id: string; name: string; email: string }[];
}

export interface VocabularyActivityRow {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  type: VocabularyActivityEventType;
  entryType: "word" | "phrase" | null;
  word: string | null;
  details: Record<string, unknown>;
  createdAt: number;
}

export interface VocabularyStaffSessionRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  mode: "flashcard" | "quiz" | "spelling";
  entryType: "word" | "phrase";
  totalWords: number;
  correctCount: number;
  accuracy: number;
  completedAt: number;
}

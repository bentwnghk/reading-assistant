import type {
  LanguageCheckCategory,
  LanguageCheckLearnClientEventType,
  LanguageCheckLearnEventType,
} from "@/constants/languageCheck";
import type {
  LearnErrorSample,
  LearnExercise,
  LearnLesson,
} from "@/utils/languageCheckLearn";
import type { LearnAnswer, Mastery } from "@/utils/languageCheckLearnGrade";

/**
 * Wire shapes of a persisted "Learn from your mistakes" session — shared by the
 * client store, the sync layer, the API routes and `src/lib/language-check-learn.ts`.
 * Type-only: safe to import anywhere (client and server).
 */

export type LearnStage = "lesson" | "practice" | "quiz";

export type LearnLocation = { unit: number; stage: LearnStage } | "summary";

export interface PracticeResult {
  /** Score of the FIRST attempt (0–1); retries are for learning, not scoring. */
  score: number;
  attempts: number;
  /** True once the item was answered correctly or its answer was revealed. */
  completed: boolean;
  /** The learner gave up and looked at the answer. */
  revealed?: boolean;
}

export interface QuizResult {
  answer: LearnAnswer;
  score: number;
  correct: boolean;
}

export interface LearnUnitWire {
  category: LanguageCheckCategory;
  mistakeCount: number;
  samples: LearnErrorSample[];
  lesson: LearnLesson | null;
  practice: LearnExercise[] | null;
  quiz: LearnExercise[] | null;
  lessonSeen: boolean;
  practiceResults: Record<string, PracticeResult>;
  quizResults: Record<string, QuizResult>;
  /** Prompts of quiz rounds already taken, so a new round never repeats them. */
  previousQuizPrompts: string[];
  quizRound: number;
  /**
   * Only present in review responses (`redactForReview`): the stage exists but
   * its questions and answers were withheld because the learner has not
   * finished it yet. Never stored, never sent by the browser.
   */
  hidden?: {
    practice?: { completed: number; total: number };
    quiz?: { answered: number; total: number };
  };
}

export type LearnSessionStatus = "in_progress" | "completed";

export interface LearnSessionWire {
  id: string;
  /** Null once the essay was deleted — the learning history is kept. */
  essayId: string | null;
  essayTitle: string;
  age: number;
  status: LearnSessionStatus;
  current: LearnLocation;
  units: LearnUnitWire[];
  createdAt: number;
  updatedAt: number;
}

/** One finished quiz round, archived when it is completed (a retake never overwrites it). */
export interface LearnRoundWire {
  category: LanguageCheckCategory;
  round: number;
  percent: number;
  correct: number;
  total: number;
  mastery: Mastery;
  items: LearnExercise[];
  results: Record<string, QuizResult>;
  completedAt: number;
}

/** A finished round without its payload (cheap enough to ride along every response). */
export type LearnRoundSummary = Omit<LearnRoundWire, "items" | "results">;

export interface LearnSessionDetailWire {
  session: LearnSessionWire;
  rounds: LearnRoundWire[];
}

/** Response of every save: the merged server state, so devices converge. */
export interface LearnSyncResponse {
  session: LearnSessionWire;
  rounds: LearnRoundSummary[];
}

/** Staff read-only view: the session, every archived round and whose it is. */
export interface LearnStaffSessionDetailWire {
  session: LearnSessionWire;
  rounds: LearnRoundWire[];
  user: { id: string; name: string; email: string };
}

// ─── Lightweight list rows ───────────────────────────────────────────────────

export interface LearnUnitSummary {
  category: LanguageCheckCategory;
  mistakeCount: number;
  lessonSeen: boolean;
  practiceCompleted: number;
  practiceTotal: number;
  practicePercent: number | null;
  quizPercent: number | null;
  quizRound: number;
  mastery: Mastery | null;
}

export interface LearnSessionSummary {
  id: string;
  essayId: string | null;
  essayTitle: string;
  age: number;
  status: LearnSessionStatus;
  unitCount: number;
  unitsCompleted: number;
  /** Average quiz % over the units that have a finished quiz; null if none. */
  avgQuizPercent: number | null;
  units: LearnUnitSummary[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface LearnStaffSessionSummary extends LearnSessionSummary {
  userId: string;
  userName: string;
  userEmail: string;
}

// ─── Patch (browser → server) ────────────────────────────────────────────────

/** Fields of a unit the client may write (samples / mistakeCount are server-owned). */
export type LearnUnitPatch = { category: LanguageCheckCategory } & Partial<
  Omit<LearnUnitWire, "category" | "mistakeCount" | "samples">
>;

export type LearnEventDetails = Record<string, string | number | boolean | null>;

export interface LearnEventInput {
  type: LanguageCheckLearnClientEventType;
  category?: LanguageCheckCategory;
  details?: LearnEventDetails;
  /** Idempotency key: a replayed event with the same key is ignored. */
  key: string;
}

export interface LearnPatch {
  current?: LearnLocation;
  units?: LearnUnitPatch[];
  events?: LearnEventInput[];
}

// ─── Activity ledger + dashboards ────────────────────────────────────────────

export interface LearnEventRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sessionId: string | null;
  essayTitle: string;
  category: LanguageCheckCategory | null;
  type: LanguageCheckLearnEventType;
  details: LearnEventDetails;
  createdAt: number;
}

export interface LearnDashboardTotals {
  learners: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  lessonsViewed: number;
  practiceAnswered: number;
  /** Mean first-attempt practice score, 0–100. */
  practiceAccuracy: number | null;
  quizzesCompleted: number;
  /** Mean quiz percentage over finished quiz rounds. */
  avgQuizPercent: number | null;
  /** Mean (latest − first) quiz % over topics retaken at least once; null if none. */
  improvement: number | null;
  /** Latest finished quiz per (learner, topic), bucketed by mastery. */
  topicsSecure: number;
  topicsDeveloping: number;
  topicsReview: number;
  activeDays: number;
  /** Estimated: gaps of at most 5 minutes between consecutive events. */
  activeMinutes: number;
  lastActiveAt: number | null;
}

export interface LearnSeriesPoint {
  /** Bucket start, YYYY-MM-DD in the viewer's time zone. */
  bucket: string;
  events: number;
  practiceAnswered: number;
  quizzesCompleted: number;
  avgQuizPercent: number | null;
}

export interface LearnCategoryStat {
  category: LanguageCheckCategory;
  learners: number;
  quizzes: number;
  /** Mean of each learner's latest quiz % in this topic. */
  avgLatest: number | null;
  /** Mean (latest − first) over learners who retook this topic; null if none did. */
  improvement: number | null;
  secure: number;
  developing: number;
  review: number;
  practiceAccuracy: number | null;
}

export interface LearnDashboardData {
  range: number;
  timeZone: string;
  bucketUnit: "day" | "week";
  totals: LearnDashboardTotals;
  series: LearnSeriesPoint[];
  categories: LearnCategoryStat[];
  /** Every finished quiz round in the window, oldest first (progress over time). */
  quizHistory: LearnQuizPoint[];
}

export interface LearnQuizPoint {
  at: number;
  category: LanguageCheckCategory;
  percent: number;
  round: number;
  sessionId: string;
}

export interface LearnStudentRow {
  userId: string;
  userName: string;
  userEmail: string;
  sessionsStarted: number;
  sessionsCompleted: number;
  quizzesCompleted: number;
  /** Mean of the learner's latest quiz % per topic. */
  avgQuizPercent: number | null;
  /** Mean latest − mean first over the learner's topics (progress over time). */
  improvement: number | null;
  practiceAccuracy: number | null;
  activeMinutes: number;
  lastActiveAt: number | null;
  weakest: { category: LanguageCheckCategory; percent: number } | null;
}

export interface LearnStaffDashboardData extends LearnDashboardData {
  students: LearnStudentRow[];
  studentsTotal: number;
  /** Filter options: learners in scope (+ class filter) that have any learning data. */
  users: { id: string; name: string; email: string }[];
}

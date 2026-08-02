/**
 * Single source of truth for the per-session "Learning Progress" percentage.
 *
 * Counts how many of the 15 workflow steps defined in
 * `components/ReadingAssistant/WorkflowProgress.tsx` are completed, returning
 * `round(completed / 15 * 100)`. Imported by every place that displays
 * progress so the value can never drift between views:
 *   - components/Dashboard/SessionsTab.tsx        (Learning Journey dialog)
 *   - utils/dashboardMetrics.ts                    (Student Dashboard)
 *   - lib/assignments.ts -> calculateAssignmentProgress (assignment roster)
 *   - lib/users.ts -> calculateProgress            (User Management / Student Data,
 *                                                   via a snake_case adapter)
 *
 * Input is a normalized camelCase shape. `extractedText` is typed
 * `string | boolean` because the teacher-dashboard SQL queries alias it to a
 * boolean `IS NOT NULL` expression (to avoid pulling large OCR blobs); the
 * truthiness check below handles both forms. The visualization step uses the
 * `visualizationGeneratedAt` timestamp (not the base64 `visualizationImage`
 * blob), which is the lightweight presence proxy per AGENTS.md Lesson 10.
 */
import { grammarGameBestScore } from "./sessionMetrics";

export interface ProgressInput {
  extractedText?: string | boolean;
  preReading?: unknown;
  studentPrediction?: string;
  summary?: string;
  mindMap?: string;
  visualizationGeneratedAt?: number;
  adaptedText?: string;
  analyzedSentences?: Record<string, unknown> | null;
  highlightedWords?: string[];
  glossary?: unknown[];
  collocations?: unknown[];
  spellingGameBestScore?: number;
  vocabularyQuizScore?: number;
  testCompleted?: boolean;
  grammarScrambleHighScore?: number;
  grammarWorkshopHighScore?: number;
  grammarSurgeryHighScore?: number;
  grammarRouletteHighScore?: number;
  grammarDuelHighScore?: number;
  grammarQuizCompleted?: boolean;
  grammarQuizScore?: number;
}

export function calculateProgress(item: ProgressInput): number {
  const steps = [
    !!item.extractedText,
    !!item.preReading && (item.studentPrediction || "").trim().length > 0,
    !!item.summary,
    !!item.mindMap,
    (Number(item.visualizationGeneratedAt ?? 0)) > 0,
    !!item.adaptedText,
    Object.keys(item.analyzedSentences || {}).length > 0,
    (item.highlightedWords || []).length > 0,
    (item.glossary || []).length > 0,
    (item.collocations || []).length > 0,
    (item.spellingGameBestScore || 0) > 0,
    (item.vocabularyQuizScore || 0) > 0,
    !!item.testCompleted,
    grammarGameBestScore(item) > 0,
    !!item.grammarQuizCompleted && (item.grammarQuizScore || 0) > 0,
  ];
  const completedCount = steps.filter(Boolean).length;
  return Math.round((completedCount / steps.length) * 100);
}

/**
 * Scoring for multiplayer spelling battles.
 *
 * Ported verbatim from `src/components/ReadingAssistant/VocabularySpelling.tsx`
 * (checkAnswer, ~line 449-463) so solo and battle scores are directly
 * comparable. The server is authoritative: it computes the score from the
 * player's submitted answer + its own clock, ignoring any client-claimed
 * point values (Hybrid authority model — see plan).
 *
 * Formula (correct answers only):
 *   base 100
 *   + (if timed) floor(remainingFraction * 50)        // speed bonus, 0..50
 *   + (if streak >= 3) floor(points * 0.1 * min(streak-2, 5))   // streak bonus, up to +50%
 *   - hintsUsed * 10                                  // per-hint penalty
 *   floored at 10
 */
import type { SpellingDifficulty } from "./types";

/** Per-word time limit (ms) by difficulty for the Listen & Type battle mode. */
export const WORD_DURATION_MS: Record<SpellingDifficulty, number> = {
  easy: 30_000,
  medium: 20_000,
  hard: 12_000,
};

/** Late-submission grace added to the per-word timeout (ms). */
export const SUBMIT_GRACE_MS = 500;

/** Pause between words (matches the solo game's 1.5s feedback window). */
export const BETWEEN_WORDS_MS = 1_500;

/** Normalize a word/answer for case- and whitespace-insensitive comparison. */
export function normalizeWord(s: string): string {
  return s.trim().toLowerCase();
}

export interface ScoreInput {
  correct: boolean;
  timed: boolean;
  durationMs: number;
  /** Time from word_start to submit receipt, measured on the SERVER (ms). */
  timeTakenMs: number;
  hintsUsed: number;
  /** Streak BEFORE this answer. */
  oldStreak: number;
}

export interface ScoreResult {
  correct: boolean;
  points: number;
  /** Streak AFTER this answer (resets to 0 on incorrect). */
  newStreak: number;
}

export function scoreAnswer(input: ScoreInput): ScoreResult {
  if (!input.correct) {
    return { correct: false, points: 0, newStreak: 0 };
  }
  const newStreak = input.oldStreak + 1;
  let points = 100;
  if (input.timed) {
    const remainingFraction = Math.max(0, Math.min(1, (input.durationMs - input.timeTakenMs) / input.durationMs));
    points += Math.floor(remainingFraction * 50);
  }
  if (newStreak >= 3) {
    points += Math.floor(points * 0.1 * Math.min(newStreak - 2, 5));
  }
  points -= input.hintsUsed * 10;
  return { correct: true, points: Math.max(points, 10), newStreak };
}

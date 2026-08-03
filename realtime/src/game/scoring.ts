/**
 * Scoring for multiplayer spelling battles.
 *
 * Ported verbatim from `src/components/ReadingAssistant/VocabularySpelling.tsx`
 * (checkAnswer, ~line 449-463) so solo and battle scores are directly
 * comparable. The server is authoritative: it computes the score from the
 * player's submitted answer + its own clock, ignoring any client-claimed
 * point values (Hybrid authority model — see plan).
 *
 * Hint policy (hard cap + escalating penalty + streak skip):
 *   - At most MAX_HINTS_PER_WORD hints per word (extra hints reported by the
 *     client are clamped by `clampHintsUsed`).
 *   - Each hint costs HINT_COSTS[n] points (escalating: 10, 20, 30, ...).
 *     Total penalty for k hints = sum of the first k entries.
 *   - A hint-aided correct answer does NOT advance the streak counter and
 *     does NOT earn a streak bonus (see "skip the streak increment" rule).
 *
 * Formula (correct answers only):
 *   base 100
 *   + (if timed) floor(remainingFraction * 50)        // speed bonus, 0..50
 *   + (if streak >= 3 AND hintsUsed === 0)
 *       floor(points * 0.1 * min(streak-2, 5))         // streak bonus, up to +50%
 *   - sum(HINT_COSTS[0..hintsUsed))                    // escalating per-hint penalty
 *   floored at 10
 *
 * Mirrored in `src/components/ReadingAssistant/SpellingBattleArena.tsx` —
 * keep both sides in sync.
 */
import type { BattleGameMode, SpellingDifficulty } from "./types";

/**
 * Per-word time limit (ms) by [game mode][difficulty]. Scramble gets more time
 * (matching the solo game) because tile reordering takes longer than transcription.
 * Mixed looks up the per-word mode in the engine.
 */
export const WORD_DURATION_MS: Record<BattleGameMode, Record<SpellingDifficulty, number>> = {
  "listen-type": { easy: 30_000, medium: 20_000, hard: 12_000 },
  scramble: { easy: 45_000, medium: 30_000, hard: 20_000 },
  "fill-blanks": { easy: 30_000, medium: 20_000, hard: 12_000 },
  mixed: { easy: 30_000, medium: 20_000, hard: 12_000 },
};

/** Late-submission grace added to the per-word timeout (ms). */
export const SUBMIT_GRACE_MS = 500;

/** Pause between words (matches the solo game's 1.5s feedback window). */
export const BETWEEN_WORDS_MS = 1_500;

/**
 * Hard cap on hints per word. A player may use at most this many hints on a
 * single word; the client disables the hint button once the cap is reached
 * and the server clamps any higher reported value.
 */
export const MAX_HINTS_PER_WORD = 3;

/**
 * Escalating per-hint point cost. The Nth hint (1-indexed) costs
 * `HINT_COSTS[N-1]`. The array length must equal MAX_HINTS_PER_WORD; if a
 * caller somehow exceeds the cap, the last entry is reused so the penalty
 * keeps growing instead of being free.
 */
export const HINT_COSTS: readonly number[] = [10, 20, 30];

/** Clamp a client-reported hint count to the allowed per-word range [0, MAX]. */
export function clampHintsUsed(reported: number): number {
  if (!Number.isFinite(reported) || reported < 0) return 0;
  return Math.min(Math.floor(reported), MAX_HINTS_PER_WORD);
}

/**
 * Total point penalty for using `count` hints (escalating sum).
 * `count` is clamped internally; safe to call with raw client values.
 */
export function hintPenalty(count: number): number {
  const n = clampHintsUsed(count);
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += HINT_COSTS[Math.min(i, HINT_COSTS.length - 1)];
  }
  return total;
}

/**
 * Cost of the NEXT hint given `usedSoFar` hints have already been used, or
 * `null` if the cap has been reached (no more hints allowed). Used by the
 * client to label the hint button with the upcoming penalty.
 */
export function nextHintCost(usedSoFar: number): number | null {
  if (usedSoFar >= MAX_HINTS_PER_WORD) return null;
  return HINT_COSTS[Math.min(usedSoFar, HINT_COSTS.length - 1)];
}

/**
 * Normalize a word/answer for case-, whitespace-, and hyphen-insensitive
 * comparison.
 *
 * Internal whitespace AND hyphens are collapsed to single spaces so that:
 *   - multi-word phrases reconstructed from word-tile scramble (or typed in
 *     listen-type) match regardless of how many spaces separated the words;
 *   - hyphenated compounds split into word-tiles (e.g. "mother-in-law" →
 *     ["mother","in","law"]) and rejoined with spaces still match the
 *     canonical hyphenated entry.
 * Mirrors the solo game's checkAnswer normalization in VocabularySpelling.tsx
 * and the battle arena's normalize() in SpellingBattleArena.tsx.
 */
export function normalizeWord(s: string): string {
  return s.replace(/[\s-]+/g, " ").trim().toLowerCase();
}

/**
 * Judge a submitted answer against the canonical word for a given mode.
 *
 * - listen-type / scramble: whole-word equality (case- + whitespace-insensitive).
 *   For scramble the client sends the tiles in selected order — concatenated
 *   for single words, space-joined for phrases.
 * - fill-blanks: the client sends only the missing letters (Nth char fills the
 *   Nth blank in `blankPositions` order). Compared case-insensitively WITHOUT
 *   trimming — a blanked space character must be preserved (mirrors the solo
 *   game's explicit warning in VocabularySpelling.tsx checkAnswer).
 */
export function judgeAnswer(
  mode: BattleGameMode,
  word: string,
  answer: string,
  blankPositions?: number[],
): boolean {
  if (mode === "fill-blanks") {
    if (!blankPositions || blankPositions.length === 0) return false;
    const missingLetters = blankPositions.map((p) => word[p].toLowerCase()).join("");
    return answer.toLowerCase() === missingLetters;
  }
  // listen-type / scramble (mixed is resolved to a base mode by the caller).
  return normalizeWord(answer) === normalizeWord(word);
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
  const clampedHints = clampHintsUsed(input.hintsUsed);
  // Skip the streak increment when hints were used: a hint-aided correct
  // answer keeps the existing streak (does not advance it, does not reset it)
  // and earns no streak bonus. The player can resume streak growth on the
  // next clean (hint-free) correct answer.
  const newStreak = clampedHints > 0 ? input.oldStreak : input.oldStreak + 1;
  let points = 100;
  if (input.timed) {
    const remainingFraction = Math.max(0, Math.min(1, (input.durationMs - input.timeTakenMs) / input.durationMs));
    points += Math.floor(remainingFraction * 50);
  }
  if (clampedHints === 0 && newStreak >= 3) {
    points += Math.floor(points * 0.1 * Math.min(newStreak - 2, 5));
  }
  points -= hintPenalty(clampedHints);
  return { correct: true, points: Math.max(points, 10), newStreak };
}

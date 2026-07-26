import { describe, expect, it } from "vitest";

import {
  scoreAnswer,
  normalizeWord,
  WORD_DURATION_MS,
} from "./scoring";

describe("normalizeWord", () => {
  it("lowercases and trims", () => {
    expect(normalizeWord("  Hello  ")).toBe("hello");
    expect(normalizeWord("WORLD")).toBe("world");
  });

  it("is symmetric for case/whitespace variants", () => {
    expect(normalizeWord("Apple")).toBe(normalizeWord(" apple "));
  });
});

describe("scoreAnswer", () => {
  it("returns 0 points and resets streak on incorrect", () => {
    const r = scoreAnswer({
      correct: false,
      timed: true,
      durationMs: 20000,
      timeTakenMs: 5000,
      hintsUsed: 0,
      oldStreak: 5,
    });
    expect(r.correct).toBe(false);
    expect(r.points).toBe(0);
    expect(r.newStreak).toBe(0);
  });

  it("awards base 100 for a correct untimed answer with no streak/hints", () => {
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 10000,
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(r.correct).toBe(true);
    expect(r.points).toBe(100);
    expect(r.newStreak).toBe(1);
  });

  it("adds a speed bonus (up to +50) when timed", () => {
    // Answered instantly → full 50 bonus.
    const instant = scoreAnswer({
      correct: true,
      timed: true,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(instant.points).toBe(150); // 100 + 50

    // Halfway through the timer → ~25 bonus (floored).
    const halfway = scoreAnswer({
      correct: true,
      timed: true,
      durationMs: 20000,
      timeTakenMs: 10000,
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(halfway.points).toBe(125); // 100 + floor(0.5 * 50) = 125

    // At the very end → 0 bonus.
    const slow = scoreAnswer({
      correct: true,
      timed: true,
      durationMs: 20000,
      timeTakenMs: 20000,
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(slow.points).toBe(100); // 100 + 0
  });

  it("clamps negative time-taken (clock skew) to 0 remainingFraction", () => {
    const r = scoreAnswer({
      correct: true,
      timed: true,
      durationMs: 20000,
      timeTakenMs: -500, // impossible, but must not crash or over-reward
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(r.points).toBe(150); // clamped to full bonus
  });

  it("applies a streak bonus starting at streak 3 (capped at +50%)", () => {
    // streak 3 → +10% of 100 = +10 → but timed bonus also applies.
    // Use untimed to isolate the streak bonus.
    const streak3 = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 0,
      oldStreak: 2, // newStreak = 3
    });
    // streak bonus = floor(100 * 0.1 * min(3-2, 5)) = floor(10) = 10
    expect(streak3.points).toBe(110);
    expect(streak3.newStreak).toBe(3);

    // streak 7 (min(7-2,5) = 5) → +50%
    const streak7 = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 0,
      oldStreak: 6, // newStreak = 7
    });
    expect(streak7.points).toBe(150); // 100 + 50
  });

  it("deducts 10 points per hint used", () => {
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 3,
      oldStreak: 0,
    });
    expect(r.points).toBe(70); // 100 - 30
  });

  it("floors the score at 10", () => {
    // 100 base - 3*... actually use many hints to push below 10.
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 20, // 100 - 200 = -100 → floored at 10
      oldStreak: 0,
    });
    expect(r.points).toBe(10);
  });

  it("difficulty durations match the solo game's listen-type values", () => {
    expect(WORD_DURATION_MS.easy).toBe(30000);
    expect(WORD_DURATION_MS.medium).toBe(20000);
    expect(WORD_DURATION_MS.hard).toBe(12000);
  });

  it("streak resets to 0 on a wrong answer after a streak", () => {
    const r = scoreAnswer({
      correct: false,
      timed: true,
      durationMs: 20000,
      timeTakenMs: 1000,
      hintsUsed: 0,
      oldStreak: 4,
    });
    expect(r.newStreak).toBe(0);
  });
});

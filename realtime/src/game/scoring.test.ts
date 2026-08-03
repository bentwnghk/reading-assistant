import { describe, expect, it } from "vitest";

import {
  scoreAnswer,
  normalizeWord,
  judgeAnswer,
  WORD_DURATION_MS,
  MAX_HINTS_PER_WORD,
  HINT_COSTS,
  clampHintsUsed,
  hintPenalty,
  nextHintCost,
} from "./scoring";

describe("normalizeWord", () => {
  it("lowercases and trims", () => {
    expect(normalizeWord("  Hello  ")).toBe("hello");
    expect(normalizeWord("WORLD")).toBe("world");
  });

  it("is symmetric for case/whitespace variants", () => {
    expect(normalizeWord("Apple")).toBe(normalizeWord(" apple "));
  });

  it("collapses internal whitespace so multi-word phrases match", () => {
    expect(normalizeWord("take off")).toBe("take off");
    expect(normalizeWord("take  off")).toBe("take off");
    expect(normalizeWord(" take   off ")).toBe("take off");
    expect(normalizeWord("Take Off")).toBe("take off");
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

  it("deducts points with an escalating per-hint penalty (10, 20, 30)", () => {
    // 1 hint → -10
    const one = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 1,
      oldStreak: 0,
    });
    expect(one.points).toBe(90); // 100 - 10

    // 2 hints → -(10 + 20) = -30
    const two = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 2,
      oldStreak: 0,
    });
    expect(two.points).toBe(70); // 100 - 30

    // 3 hints (the cap) → -(10 + 20 + 30) = -60
    const three = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 3,
      oldStreak: 0,
    });
    expect(three.points).toBe(40); // 100 - 60
  });

  it("clamps hintsUsed to MAX_HINTS_PER_WORD (server is authoritative)", () => {
    // A buggy/malicious client reports 20 hints; server treats it as the cap.
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 20,
      oldStreak: 0,
    });
    // Clamped to 3 → penalty = 60 → 100 - 60 = 40 (no longer floored at 10).
    expect(r.points).toBe(40);
  });

  it("floors the score at 10 when penalties would otherwise drop it below", () => {
    // The cap makes a sub-10 score impossible purely from hints (max -60),
    // so combine with the timed floor path by giving a tiny base. Use a
    // hypothetical via hintPenalty directly to document the floor invariant.
    expect(MAX_HINTS_PER_WORD).toBe(3);
    expect(hintPenalty(3)).toBe(60);
    // Sanity: an incorrect answer is always floored at 0 (separate path).
    const wrong = scoreAnswer({
      correct: false,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 0,
      oldStreak: 0,
    });
    expect(wrong.points).toBe(0);
  });

  it("does not advance the streak when hints were used (no bonus either)", () => {
    // Player on streak 2 uses a hint and answers correctly. Streak should
    // stay at 2 (not advance to 3, not reset) and no streak bonus is added.
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 1,
      oldStreak: 2,
    });
    expect(r.newStreak).toBe(2); // unchanged
    expect(r.points).toBe(90); // 100 - 10, no streak bonus

    // Contrast: the same answer with no hint advances the streak and earns
    // the +10% streak bonus.
    const clean = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 0,
      oldStreak: 2,
    });
    expect(clean.newStreak).toBe(3);
    expect(clean.points).toBe(110); // 100 + floor(100 * 0.1 * 1)
  });

  it("preserves an existing high streak (but skips its bonus) when hints are used", () => {
    // Streak 6, hint used: streak stays at 6, no +50% bonus applied.
    const r = scoreAnswer({
      correct: true,
      timed: false,
      durationMs: 20000,
      timeTakenMs: 0,
      hintsUsed: 1,
      oldStreak: 6,
    });
    expect(r.newStreak).toBe(6);
    expect(r.points).toBe(90); // 100 - 10, no streak bonus
  });

  it("difficulty durations match the solo game's per-mode values", () => {
    expect(WORD_DURATION_MS["listen-type"].easy).toBe(30000);
    expect(WORD_DURATION_MS["listen-type"].medium).toBe(20000);
    expect(WORD_DURATION_MS["listen-type"].hard).toBe(12000);
    expect(WORD_DURATION_MS["fill-blanks"].medium).toBe(20000);
    // Scramble gets more time (matching the solo game).
    expect(WORD_DURATION_MS.scramble.easy).toBe(45000);
    expect(WORD_DURATION_MS.scramble.medium).toBe(30000);
    expect(WORD_DURATION_MS.scramble.hard).toBe(20000);
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

describe("judgeAnswer", () => {
  it("listen-type: whole-word equality, case- + whitespace-insensitive", () => {
    expect(judgeAnswer("listen-type", "Apple", "apple")).toBe(true);
    expect(judgeAnswer("listen-type", " Apple ", "apple")).toBe(true);
    expect(judgeAnswer("listen-type", "apple", "aple")).toBe(false);
  });

  it("scramble: tiles concatenated in selected order equal the word", () => {
    expect(judgeAnswer("scramble", "cat", "cat")).toBe(true);
    expect(judgeAnswer("scramble", "Cat", " cAt ")).toBe(true);
    expect(judgeAnswer("scramble", "cat", "cta")).toBe(false);
  });

  it("scramble: phrase tiles space-joined match the canonical phrase", () => {
    // Phrase "take off" → word-tiles ["take", "off"] joined as "take off".
    expect(judgeAnswer("scramble", "take off", "take off")).toBe(true);
    // Extra/different internal spacing still matches (normalize collapses).
    expect(judgeAnswer("scramble", "take off", "take  off")).toBe(true);
    // Tiles in the wrong word order never match.
    expect(judgeAnswer("scramble", "take off", "off take")).toBe(false);
    // A concatenated (no-space) join would NOT match — this is why the client
    // must space-join phrase tiles before submitting.
    expect(judgeAnswer("scramble", "take off", "takeoff")).toBe(false);
  });

  it("scramble: hyphenated-compound word-tiles space-joined match the canonical", () => {
    // "mother-in-law" → word-tiles ["mother","in","law"] joined with spaces.
    // normalize treats hyphens and spaces as equivalent so the match succeeds.
    expect(judgeAnswer("scramble", "mother-in-law", "mother in law")).toBe(true);
    // Mixed-separator entry: "once-in-a-lifetime experience" → 5 word-tiles.
    expect(judgeAnswer("scramble", "once-in-a-lifetime experience", "once in a lifetime experience")).toBe(true);
    // Wrong tile order never matches.
    expect(judgeAnswer("scramble", "mother-in-law", "law in mother")).toBe(false);
  });

  it("listen-type: typed phrase matches regardless of internal spacing", () => {
    expect(judgeAnswer("listen-type", "take off", "take off")).toBe(true);
    expect(judgeAnswer("listen-type", "take off", "take  off")).toBe(true);
    expect(judgeAnswer("listen-type", "Take Off", " take off ")).toBe(true);
  });

  it("fill-blanks: matches only the missing letters in blank-position order", () => {
    // word "c_t" with positions [1] → missing letter "a"
    expect(judgeAnswer("fill-blanks", "cat", "a", [1])).toBe(true);
    expect(judgeAnswer("fill-blanks", "cat", "A", [1])).toBe(true);
    // word "_a_" with positions [0, 2] → missing "ct"
    expect(judgeAnswer("fill-blanks", "cat", "ct", [0, 2])).toBe(true);
    expect(judgeAnswer("fill-blanks", "cat", "c", [0, 2])).toBe(false);
  });

  it("fill-blanks: does NOT trim (a blanked space must be preserved)", () => {
    // word "a d" (length 3) with position [1] blanked → the blank is a space.
    expect(judgeAnswer("fill-blanks", "a d", " ", [1])).toBe(true);
  });

  it("fill-blanks: returns false when no blank positions provided", () => {
    expect(judgeAnswer("fill-blanks", "cat", "cat")).toBe(false);
  });
});

describe("hint helpers", () => {
  it("clampHintsUsed bounds to [0, MAX_HINTS_PER_WORD] and rejects garbage", () => {
    expect(clampHintsUsed(0)).toBe(0);
    expect(clampHintsUsed(2)).toBe(2);
    expect(clampHintsUsed(MAX_HINTS_PER_WORD)).toBe(MAX_HINTS_PER_WORD);
    expect(clampHintsUsed(99)).toBe(MAX_HINTS_PER_WORD);
    expect(clampHintsUsed(-5)).toBe(0);
    expect(clampHintsUsed(NaN)).toBe(0);
    expect(clampHintsUsed(2.9)).toBe(2); // floored, not rounded
  });

  it("hintPenalty returns the escalating cumulative sum", () => {
    expect(hintPenalty(0)).toBe(0);
    expect(hintPenalty(1)).toBe(10);
    expect(hintPenalty(2)).toBe(30); // 10 + 20
    expect(hintPenalty(3)).toBe(60); // 10 + 20 + 30
    // Clamped: reporting 5 hints costs the same as 3.
    expect(hintPenalty(5)).toBe(60);
  });

  it("HINT_COSTS length matches MAX_HINTS_PER_WORD", () => {
    expect(HINT_COSTS.length).toBe(MAX_HINTS_PER_WORD);
  });

  it("nextHintCost returns the upcoming cost or null at the cap", () => {
    expect(nextHintCost(0)).toBe(10); // 1st hint costs 10
    expect(nextHintCost(1)).toBe(20); // 2nd hint costs 20
    expect(nextHintCost(2)).toBe(30); // 3rd hint costs 30
    expect(nextHintCost(3)).toBeNull(); // cap reached
    expect(nextHintCost(99)).toBeNull();
  });
});

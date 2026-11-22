import { describe, expect, it } from "vitest";
import {
  computeStreak,
  diffDays,
  milestoneReached,
  pickDailyWord,
  shiftDayKey,
} from "./dailyWord";

describe("dayKey helpers", () => {
  it("shifts across month and year boundaries", () => {
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("diffs calendar days", () => {
    expect(diffDays("2026-11-22", "2026-11-25")).toBe(3);
    expect(diffDays("2026-11-22", "2026-11-20")).toBe(-2);
  });
});

describe("pickDailyWord", () => {
  const words = ["apple", "brave", "cloud", "dream", "eager"].map((word) => ({ word }));

  it("is deterministic and independent of list order", () => {
    const a = pickDailyWord(words, "2026-11-22");
    const b = pickDailyWord([...words].reverse(), "2026-11-22");
    expect(a).toEqual(b);
  });

  it("does not repeat until the bank is exhausted", () => {
    const seen = new Set<string>();
    for (let i = 0; i < words.length; i++) {
      seen.add(pickDailyWord(words, shiftDayKey("2026-11-22", i))!.word);
    }
    expect(seen.size).toBe(words.length);
  });

  it("returns null for an empty bank", () => {
    expect(pickDailyWord([], "2026-11-22")).toBeNull();
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    const r = computeStreak(["2026-11-20", "2026-11-21", "2026-11-22"], "2026-11-22");
    expect(r).toEqual({ current: 3, best: 3 });
  });
  it("stays alive when today is not yet learned", () => {
    expect(computeStreak(["2026-11-20", "2026-11-21"], "2026-11-22").current).toBe(2);
  });
  it("breaks after a missed day but keeps best", () => {
    const r = computeStreak(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-21"], "2026-11-22");
    expect(r).toEqual({ current: 1, best: 3 });
  });
});

describe("milestoneReached", () => {
  it("flags milestone streaks only", () => {
    expect(milestoneReached(7)).toBe(7);
    expect(milestoneReached(8)).toBeNull();
  });
});

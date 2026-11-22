import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./srs";

const DAY = 86_400_000;

describe("daily-word SRS advance (one completed day = one correct review)", () => {
  it("moves the word up exactly one level", () => {
    for (const level of [0, 1, 2, 3, 4] as const) {
      const { newMastery, nextReviewAt } = calculateNextReview(level, true);
      expect(newMastery).toBe(level + 1);
      expect(nextReviewAt).toBeGreaterThan(Date.now());
    }
  });
  it("caps at level 5 and uses the 30-day interval", () => {
    const before = Date.now();
    const { newMastery, nextReviewAt } = calculateNextReview(5, true);
    expect(newMastery).toBe(5);
    expect(nextReviewAt - before).toBeGreaterThanOrEqual(29 * DAY);
  });
});

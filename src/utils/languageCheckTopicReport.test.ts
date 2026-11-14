import { describe, it, expect } from "vitest";
import {
  averageOf,
  distributionOf,
  maxMarksOf,
  percentOf,
  schemeOfEssayType,
  summarizeScores,
} from "./languageCheckTopicReport";

describe("topic report maths", () => {
  it("averages to 1 dp and skips missing scores", () => {
    expect(averageOf([5, 6, null, 6])).toBe(5.7);
    expect(averageOf([null])).toBeNull();
    expect(averageOf([])).toBeNull();
  });

  it("summarises per criterion independently", () => {
    const s = summarizeScores([
      { content: 4, language: 5, organization: 3, features: null, overall: 12 },
      { content: 5, language: 6, organization: 4, features: null, overall: 15 },
    ]);
    expect(s).toEqual({ content: 4.5, language: 5.5, organization: 3.5, features: null, overall: 13.5 });
  });

  it("maps essay types to marking schemes", () => {
    expect(maxMarksOf(schemeOfEssayType("dse-part-a")).overall).toBe(21);
    expect(maxMarksOf(schemeOfEssayType("js-writing")).features).toBe(3);
    expect(maxMarksOf(schemeOfEssayType("tsa-writing")).overall).toBe(12);
  });

  it("buckets overall scores into percentage bands", () => {
    expect(percentOf(null, 21)).toBeNull();
    expect(distributionOf([21, 17, 13, 8, 2, null], 21)).toEqual([1, 1, 0, 1, 2]);
    // exact 20/40/60/80 percent cuts: 19%→0, 20%→1, 40%→2, 60%→3, 80%→4
    expect(distributionOf([4, 4.2, 8.4, 10.5, 12.6, 16.8], 21)).toEqual([1, 1, 2, 1, 1]);
  });
});

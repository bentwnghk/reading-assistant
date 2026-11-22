import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getPool: vi.fn() }));

import { isDayInRange, isPlausibleToday, wordKeyOf } from "./daily-word";

const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);

describe("isPlausibleToday", () => {
  it("accepts the UTC day and its neighbours (timezones)", () => {
    expect(isPlausibleToday("2026-11-22", NOW)).toBe(true);
    expect(isPlausibleToday("2026-11-21", NOW)).toBe(true);
    expect(isPlausibleToday("2026-11-23", NOW)).toBe(true);
  });
  it("rejects backdated / far-future days and junk", () => {
    expect(isPlausibleToday("2026-11-10", NOW)).toBe(false);
    expect(isPlausibleToday("2026-12-30", NOW)).toBe(false);
    expect(isPlausibleToday("not-a-day", NOW)).toBe(false);
  });
});

describe("isDayInRange", () => {
  it("allows the preview window but not beyond", () => {
    expect(isDayInRange("2026-12-20", NOW)).toBe(true);
    expect(isDayInRange("2027-02-01", NOW)).toBe(false);
  });
});

describe("wordKeyOf", () => {
  it("normalises case and spacing", () => {
    expect(wordKeyOf("  Gather ")).toBe("gather");
  });
});

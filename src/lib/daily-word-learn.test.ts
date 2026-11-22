import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("./db", () => ({ getPool: vi.fn(() => ({ query })) }));

import { markDailyWordLearned } from "./daily-word";

const ROW = { word: "gather", learned_at: 1732286400000, on_time: true, note: "" };

beforeEach(() => {
  query.mockReset();
});

describe("markDailyWordLearned", () => {
  it("reports newlyLearned when a pinned unlearned row transitions", async () => {
    query.mockResolvedValueOnce({ rows: [ROW], rowCount: 1 });
    const r = await markDailyWordLearned("u1", "2026-11-22", "gather", true);
    expect(r.newlyLearned).toBe(true);
    expect(r.day.word).toBe("gather");
    expect(query).toHaveBeenCalledTimes(1);
    // UPDATE path: the pinned word is kept, not overwritten.
    expect(query.mock.calls[0][0]).toMatch(/^UPDATE daily_word_progress/);
    // Regression: an unused $3 (word) made PostgreSQL fail with
    // "could not determine data type of parameter $3".
    expect(query.mock.calls[0][1]).toEqual(["u1", "2026-11-22", expect.any(Number), true]);
  });

  it("reports newlyLearned when the day is inserted (learn before pin)", async () => {
    query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [ROW], rowCount: 1 });
    const r = await markDailyWordLearned("u1", "2026-11-22", "gather", true);
    expect(r.newlyLearned).toBe(true);
    expect(query.mock.calls[1][0]).toMatch(/^INSERT INTO daily_word_progress/);
  });

  it("reports newlyLearned=false when another device already learned it", async () => {
    query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE: already learned
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT: conflict, no-op
      .mockResolvedValueOnce({ rows: [ROW], rowCount: 1 }); // read stored row
    const r = await markDailyWordLearned("u1", "2026-11-22", "gather", true);
    expect(r.newlyLearned).toBe(false);
    expect(r.day.onTime).toBe(true);
  });

  it("downgrades on_time when the claimed day is not today (anti-backdating)", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...ROW, on_time: false }], rowCount: 1 });
    const r = await markDailyWordLearned("u1", "2026-11-01", "gather", true);
    expect(r.day.onTime).toBe(false);
  });
});

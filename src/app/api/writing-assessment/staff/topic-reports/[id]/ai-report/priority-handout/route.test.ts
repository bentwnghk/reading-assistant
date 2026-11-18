import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Real priority-handout route handler + real lib against a mocked pg pool.
// These pin the persistence contract the report page depends on: a handout is
// merged into the report row's priority_handouts map (guarded by the report
// snapshot), the saved-report read maps the map back out, and regenerating the
// report clears it.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let updateRows: Record<string, unknown>[] = [{ topic_id: "t1" }];
let existsRows: Record<string, unknown>[] = [{ "?column?": 1 }];
let savedPriorityHandouts: unknown = null;

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      if (/^UPDATE/i.test(sql.trim())) return { rows: updateRows };
      if (sql.includes("SELECT 1 FROM language_check_topic_ai_reports")) return { rows: existsRows };
      if (sql.includes("report, generated_at, follow_up, priority_handouts FROM language_check_topic_ai_reports")) {
        return {
          rows: [
            {
              report: { version: 1, generatedAt: 111 },
              generated_at: new Date(0),
              follow_up: null,
              priority_handouts: savedPriorityHandouts,
            },
          ],
        };
      }
      return { rows: [] };
    },
  }),
}));

import { PUT } from "./route";
import { getSavedAiReport, saveAiReport } from "@/lib/language-check-topic-ai-report";

function makeRequest(body?: unknown) {
  return {
    method: "PUT",
    nextUrl: new URL("http://localhost/api/writing-assessment/staff/topic-reports/t1/ai-report/priority-handout"),
    text: async () => JSON.stringify(body),
  } as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "t1" }) };

const handout = {
  lesson: {
    title: "Subject-verb agreement",
    summary: "The verb must match its subject.",
    rules: [{ heading: "Add -s", explanation: "he/she/it + verb-s", pattern: "", examples: ["He plays."] }],
    contrasts: [],
    tips: [],
  },
  exercises: [
    {
      type: "fill-blank",
      id: "ph1",
      sentence: "She ___ to school every day.",
      answers: [["goes"]],
      hint: "Every day = he/she/it + ?",
      explanation: "Add -s.",
      explanationZh: "加 -s。",
    },
  ],
};

beforeEach(() => {
  queries.length = 0;
  updateRows = [{ topic_id: "t1" }];
  existsRows = [{ "?column?": 1 }];
  savedPriorityHandouts = null;
});

describe("priority handout persistence", () => {
  it("PUT merges the handout into the report row, guarded by the snapshot", async () => {
    const res = await PUT(makeRequest({ generatedAt: 111, index: 1, handout }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true });

    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    expect(update.sql).toContain("SET priority_handouts");
    expect(update.sql).toContain("(report->>'generatedAt')::bigint = $3");
    // [topic, user, snapshot, index, handout jsonb]
    expect(update.values[0]).toBe("t1");
    expect(update.values[1]).toBe("teacher-1");
    expect(update.values[2]).toBe(111);
    expect(update.values[3]).toBe("1");
    expect(JSON.parse(update.values[4] as string)).toMatchObject({ lesson: handout.lesson, exercises: handout.exercises });
  });

  it("PUT accepts the full 10-question handout the generator produces", async () => {
    // Regression guard: the exercise cap must never drift below the
    // generator's target (10), or every save 400s and the dropdown
    // never survives a reload.
    const ten = Array.from({ length: 10 }, (_, i) => ({
      ...handout.exercises[0],
      id: `ph${i + 1}`,
    }));
    const res = await PUT(makeRequest({ generatedAt: 111, index: 0, handout: { ...handout, exercises: ten } }), ctx);
    expect(res.status).toBe(200);
  });

  it("PUT → 409 when the report was regenerated since (stale snapshot)", async () => {
    updateRows = []; // UPDATE matched nothing…
    existsRows = [{ "?column?": 1 }]; // …but the row exists → stale
    const res = await PUT(makeRequest({ generatedAt: 111, index: 0, handout }), ctx);
    expect(res.status).toBe(409);
  });

  it("PUT → 404 when there is no saved report row at all", async () => {
    updateRows = [];
    existsRows = [];
    const res = await PUT(makeRequest({ generatedAt: 111, index: 0, handout }), ctx);
    expect(res.status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    expect((await PUT(makeRequest({ generatedAt: -1, index: 0, handout }), ctx)).status).toBe(400);
    expect((await PUT(makeRequest({ generatedAt: 111, index: 99, handout }), ctx)).status).toBe(400);
    expect((await PUT(makeRequest({ generatedAt: 111, index: 0, handout: { ...handout, exercises: [] } }), ctx)).status).toBe(400);
  });

  it("getSavedAiReport maps the stored handout map back out", async () => {
    savedPriorityHandouts = { generatedAt: 111, handouts: { 0: handout } };
    const saved = await getSavedAiReport("t1", "teacher-1");
    expect(saved?.priorityHandouts).toEqual({ generatedAt: 111, handouts: { 0: handout } });
  });

  it("getSavedAiReport returns null for a malformed handout map", async () => {
    savedPriorityHandouts = { handouts: {} };
    const saved = await getSavedAiReport("t1", "teacher-1");
    expect(saved?.priorityHandouts).toBeNull();
  });

  it("regenerating the report clears the stored handouts", async () => {
    await saveAiReport("t1", "teacher-1", {
      version: 1,
      generatedAt: 222,
      model: "m",
      essayCount: 3,
      base: {} as LanguageCheckTopicReport,
      categories: [],
      insights: {
        headline: "",
        summary: "",
        criteria: [],
        strengths: [],
        mistakes: [],
        priorities: [],
        quickTips: [],
      },
    });
    const upsert = queries.find((q) => q.sql.startsWith("INSERT INTO language_check_topic_ai_reports"))!;
    expect(upsert.sql).toContain("priority_handouts = NULL");
  });
});

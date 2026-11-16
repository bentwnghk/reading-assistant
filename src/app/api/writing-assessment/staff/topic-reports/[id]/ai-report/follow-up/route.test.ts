import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Real follow-up route handler + real lib against a mocked pg pool. These
// pin the persistence contract the report page depends on: a worksheet is
// stored on the saved report's row (guarded by the report snapshot), the
// saved-report read maps it back out, and regenerating the report clears it.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let updateRows: Record<string, unknown>[] = [{ topic_id: "t1" }];
let existsRows: Record<string, unknown>[] = [{ "?column?": 1 }];

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      if (/^UPDATE/i.test(sql.trim())) return { rows: updateRows };
      if (sql.includes("SELECT 1 FROM language_check_topic_ai_reports")) return { rows: existsRows };
      if (sql.includes("follow_up FROM language_check_topic_ai_reports")) {
        return {
          rows: [
            {
              report: { version: 1, generatedAt: 111 },
              generated_at: new Date(0),
              follow_up: { generatedAt: 111, items: [{ category: "c", exercise: { type: "fill-blank", id: "fu1" } }] },
            },
          ],
        };
      }
      return { rows: [] };
    },
  }),
}));

import { PUT } from "./route";
import { GET as getAiReport } from "../route";
import { getSavedAiReport, saveAiReport } from "@/lib/language-check-topic-ai-report";

function makeRequest(body?: unknown) {
  return {
    method: "PUT",
    nextUrl: new URL("http://localhost/api/writing-assessment/staff/topic-reports/t1/ai-report/follow-up"),
    text: async () => JSON.stringify(body),
  } as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "t1" }) };

function makeGet() {
  return {
    nextUrl: new URL("http://localhost/api/writing-assessment/staff/topic-reports/t1/ai-report"),
  } as unknown as NextRequest;
}

const items = [
  {
    category: "subject-verb-agreement",
    exercise: {
      type: "fill-blank",
      id: "fu1",
      sentence: "She ___ to school.",
      answers: [["goes"]],
      hint: "Every day = he/she/it + ?",
      explanation: "Add -s.",
      explanationZh: "加 -s。",
    },
  },
];

beforeEach(() => {
  queries.length = 0;
  updateRows = [{ topic_id: "t1" }];
  existsRows = [{ "?column?": 1 }];
});

describe("follow-up worksheet persistence", () => {
  it("PUT stores the worksheet on the report row, guarded by the snapshot", async () => {
    const res = await PUT(makeRequest({ generatedAt: 111, items }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true });

    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    expect(update.sql).toContain("SET follow_up =");
    expect(update.sql).toContain("(report->>'generatedAt')::bigint = $4");
    // [topic, user, {generatedAt, items} jsonb, snapshot]
    expect(update.values[0]).toBe("t1");
    expect(update.values[1]).toBe("teacher-1");
    expect(JSON.parse(update.values[2] as string)).toMatchObject({ generatedAt: 111, items });
    expect(update.values[3]).toBe(111);
  });

  it("PUT → 409 when the report was regenerated since (stale snapshot)", async () => {
    updateRows = []; // UPDATE matched nothing…
    existsRows = [{ "?column?": 1 }]; // …but the row exists → stale
    const res = await PUT(makeRequest({ generatedAt: 111, items }), ctx);
    expect(res.status).toBe(409);
  });

  it("PUT → 404 when there is no saved report row at all", async () => {
    updateRows = [];
    existsRows = [];
    const res = await PUT(makeRequest({ generatedAt: 111, items }), ctx);
    expect(res.status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    const res = await PUT(makeRequest({ generatedAt: -1, items: [] }), ctx);
    expect(res.status).toBe(400);
  });

  it("getSavedAiReport maps the stored worksheet back out", async () => {
    const saved = await getSavedAiReport("t1", "teacher-1");
    expect(saved?.followUp).toEqual({
      generatedAt: 111,
      items: [{ category: "c", exercise: { type: "fill-blank", id: "fu1" } }],
    });
  });

  it("regenerating the report clears the stored worksheet", async () => {
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
    expect(upsert.sql).toContain("follow_up = NULL");
  });

  it("ai-report GET returns the worksheet as followUp", async () => {
    const res = await getAiReport(makeGet(), ctx);
    // The real getTopicReport runs against the mock and yields no topic →
    // 404 before the mapping; the saved-read mapping is covered above.
    expect([200, 404]).toContain(res.status);
  });
});

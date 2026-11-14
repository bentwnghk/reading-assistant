import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Run the REAL topic-reports route handler against a mocked pg pool and
// record the exact SQL + params. Regression tests for the tally between the
// Topic reports tab and the Student essays tab: both must count over the
// SAME essay set (staffEssayConditions, writer-membership class filters),
// card membership must be essay-driven, checked counts must count essay
// ROWS (no per-student dedup), and the checked-essays total must include
// essays with no topic link.

const queries: Array<{ sql: string; values: unknown[] }> = [];

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      // Return shape-compatible rows for each of the report queries.
      if (sql.includes("AS checked_essays")) return { rows: [{ checked_essays: 7 }] };
      return { rows: [] }; // topic rows / checked aggregates / averages / sweep
    },
  }),
}));

import { GET } from "./route";

function makeRequest(query = "") {
  return {
    nextUrl: new URL(
      `http://localhost/api/writing-assessment/staff/topic-reports${query}`,
    ),
  } as unknown as NextRequest;
}

beforeEach(() => {
  queries.length = 0;
});

// (A) topic rows — carries the roster subquery alias.
const cardQuery = () => queries.find((q) => q.sql.includes("AS student_count"))!;
// (B) per-topic checked aggregates.
const checkedQuery = () => queries.find((q) => q.sql.includes("AS done_class"))!;
// (D) checked-essays total.
const totalQuery = () => queries.find((q) => q.sql.includes("AS checked_essays"))!;

describe("topic-reports route: real handler, recorded SQL", () => {
  it("returns cards plus the checked-essays total", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topics).toEqual([]);
    expect(body.checkedEssays).toBe(7);
  });

  it("card membership is essay-driven: live topics with ≥1 in-scope essay", async () => {
    await GET(makeRequest());
    const sql = cardQuery().sql;
    expect(sql).toContain("SELECT DISTINCT e.topic_id");
    expect(sql).toContain("e.topic_id IS NOT NULL");
    // NOT the old viewer-visibility gate over the topic's own class.
    expect(sql).not.toContain("OR t.class_id IN (");
  });

  it("class filter narrows by WRITER membership, exactly like the essay log", async () => {
    await GET(makeRequest("?classId=class-7"));
    expect(cardQuery().sql).toContain(
      "e.user_id IN (SELECT student_id FROM class_members WHERE class_id =",
    );
    // Scope param first, then the class — same clause order as the log.
    expect(checkedQuery().values).toEqual(["teacher-1", "class-7"]);
    // Every essay-set query narrows, including the total.
    expect(totalQuery().sql).toContain("class_id = $2");
  });

  it("mine=1 narrows to the caller's own classes", async () => {
    await GET(makeRequest("?mine=1"));
    expect(cardQuery().sql).toContain("mc.teacher_id = $2");
    expect(checkedQuery().values).toEqual(["teacher-1", "teacher-1"]);
  });

  it("checked counts essay ROWS; the roster numerator counts distinct students", async () => {
    await GET(makeRequest());
    const sql = checkedQuery().sql;
    expect(sql).toContain("COUNT(*)::int AS checked");
    expect(sql).toContain("COUNT(DISTINCT e.user_id)");
    // No per-student dedup on the essay count itself (retakes count).
    expect(sql).not.toContain("DISTINCT ON");
  });

  it("the total counts checked essays regardless of topic link", async () => {
    await GET(makeRequest());
    expect(totalQuery().sql).not.toContain("e.topic_id");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Staff re-check: POST /api/grammar-check/staff/[id]/recheck must re-validate
// the caller's staff scope against the essay's owner BEFORE writing, force
// status = 'checked' + reset the assessment (a new check invalidates the old
// one), and accept only the fields a finished check produces — the schema has
// no transcript/title, so those can never be written through this route.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";
/** getStaffEssay result: does the essay exist inside the caller's scope? */
let inScope = true;

vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "staff-1", role } } : null),
}));

vi.mock("@/lib/users", () => ({
  getSchoolForUser: async () => "school-1",
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      const flat = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: flat, values: values ?? [] });
      // getStaffEssay scope SELECT — the essay id is always the last param.
      if (flat.startsWith("SELECT e.id") && flat.includes("AS user_name")) {
        return {
          rows: inScope
            ? [
                {
                  id: values?.[values.length - 1],
                  user_id: "student-1",
                  user_name: "Alice",
                  transcript: "text",
                  corrections: [],
                },
              ]
            : [],
        };
      }
      return { rows: [], rowCount: 0 };
    },
  }),
}));

import { POST } from "./route";

const BODY = {
  checkedText: "He go to school.",
  corrections: [
    {
      id: "e1",
      start: 0,
      end: 2,
      original: "He",
      correction: "He goes",
      category: "subject-verb-agreement",
      explanation: "Third person singular takes -s.",
      explanationZh: "第三人稱單數動詞要加 s。",
    },
  ],
  checkModel: "gpt-6.1-sol",
  droppedCount: 1,
};

function call(body: unknown) {
  return {
    method: "POST",
    json: async () => body,
  } as unknown as NextRequest;
}

const ctx = () => ({ params: Promise.resolve({ id: "essay-1" }) });

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
  inScope = true;
});

const scopeQuery = () =>
  queries.find((q) => q.sql.startsWith("SELECT e.id"))!;
const updateQuery = () =>
  queries.find((q) => q.sql.startsWith("UPDATE language_check_essays"));

describe("POST /api/grammar-check/staff/[id]/recheck", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect((await POST(call(BODY), ctx())).status).toBe(401);
    expect(queries).toHaveLength(0);
  });

  it("refuses students without touching the database", async () => {
    role = "student";
    expect((await POST(call(BODY), ctx())).status).toBe(403);
    expect(queries).toHaveLength(0);
  });

  it("rejects an invalid body before any query", async () => {
    const res = await POST(
      call({ checkedText: "text", corrections: "nope" }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect(queries).toHaveLength(0);
  });

  it("teacher in scope: writes checked status and resets the assessment", async () => {
    const res = await POST(call(BODY), ctx());
    expect(res.status).toBe(200);
    // Scope predicate + essay id both constrain the read.
    const scope = scopeQuery();
    expect(scope.sql).toContain("sc.teacher_id = $1");
    expect(scope.sql).toContain("e.id = $2");
    expect(scope.values).toEqual(["staff-1", "essay-1"]);
    // The write mirrors an owner re-check: status forced, assessment reset.
    const update = updateQuery()!;
    expect(update.sql).toContain("status = 'checked'");
    expect(update.sql).toContain("assessment = NULL");
    expect(update.sql).toContain("WHERE id = $5");
    expect(update.values).toEqual([
      BODY.checkedText,
      JSON.stringify(BODY.corrections),
      BODY.checkModel,
      BODY.droppedCount,
      "essay-1",
    ]);
  });

  it("admin scope narrows by school", async () => {
    role = "admin";
    const res = await POST(call(BODY), ctx());
    expect(res.status).toBe(200);
    expect(scopeQuery().sql).toContain("u.school_id = $1");
    expect(scopeQuery().sql).toContain("e.id = $2");
  });

  it("out-of-scope essay: 404 and nothing written", async () => {
    inScope = false;
    const res = await POST(call(BODY), ctx());
    expect(res.status).toBe(404);
    expect(updateQuery()).toBeUndefined();
  });
});

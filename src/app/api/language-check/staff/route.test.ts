import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Run the REAL staff route handler against a mocked pg pool and record the
// exact SQL + params for each filter combination. Regression tests for the
// Essay Activity Log filters: rows, count AND stats must all narrow by
// class/student/status/search; only the student options stay scope+class.

const queries: Array<{ sql: string; values: unknown[] }> = [];

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      // Return shape-compatible rows for each of the staff queries.
      if (sql.includes("AS user_name")) return { rows: [] }; // list
      if (sql.includes("COUNT(*)::int AS n")) return { rows: [{ n: 0 }] }; // count
      if (sql.includes("AS checked")) return { rows: [{ total: 0, checked: 0, transcribed: 0, draft: 0, students: 0, pages: 0, corrections: 0 }] }; // stats
      return { rows: [] }; // users
    },
  }),
}));

import { GET } from "./route";

function makeRequest(query: string) {
  return {
    nextUrl: new URL(`http://localhost/api/language-check/staff?${query}`),
    json: async () => ({}),
  } as unknown as NextRequest;
}

beforeEach(() => {
  queries.length = 0;
});

const listQuery = () => queries.find((q) => q.sql.includes("AS user_name"))!;
const statsQuery = () => queries.find((q) => q.sql.includes("AS checked"))!;
const usersQuery = () => queries.find((q) => q.sql.includes("AS id"))!;

describe("staff route: real handler, recorded SQL", () => {
  it("student filter without class narrows rows, count AND stats", async () => {
    const res = await GET(makeRequest("page=1&pageSize=20&userId=student-9"));
    expect(res.status).toBe(200);
    const list = listQuery();
    expect(list.sql).toContain("e.user_id = $2"); // $1 = teacher scope param
    expect(list.sql).toContain("sc.teacher_id = $1");
    expect(list.values).toEqual(["teacher-1", "student-9", 20, 0]);
    const stats = statsQuery();
    expect(stats.sql).toContain("e.user_id = $2");
    expect(stats.values).toEqual(["teacher-1", "student-9"]);
    // Student options stay scope-only so the picker stays usable.
    expect(usersQuery().sql).not.toContain("e.user_id = $2");
  });

  it("status filter without class narrows rows, count AND stats", async () => {
    const res = await GET(makeRequest("page=1&pageSize=20&status=checked"));
    expect(res.status).toBe(200);
    const list = listQuery();
    expect(list.sql).toContain("e.status = $2");
    expect(list.values).toEqual(["teacher-1", "checked", 20, 0]);
    const stats = statsQuery();
    expect(stats.sql).toContain("e.status = $2");
    expect(stats.values).toEqual(["teacher-1", "checked"]);
    expect(usersQuery().sql).not.toContain("e.status = $2");
  });

  it("class filter narrows rows, stats AND student options", async () => {
    const res = await GET(makeRequest("page=1&pageSize=20&classId=class-7"));
    expect(res.status).toBe(200);
    const list = listQuery();
    expect(list.sql).toContain("class_id = $2");
    expect(list.values).toEqual(["teacher-1", "class-7", 20, 0]);
    expect(statsQuery().sql).toContain("class_id = $2");
    expect(usersQuery().sql).toContain("class_id = $2");
  });

  it("mine=1 (My Classes) narrows rows, stats AND student options", async () => {
    const res = await GET(makeRequest("page=1&pageSize=20&mine=1"));
    expect(res.status).toBe(200);
    const list = listQuery();
    expect(list.sql).toContain("FROM class_members mcm");
    expect(list.sql).toContain("mc.teacher_id = $2");
    expect(list.values).toEqual(["teacher-1", "teacher-1", 20, 0]);
    expect(statsQuery().sql).toContain("mc.teacher_id = $2");
    expect(usersQuery().sql).toContain("mc.teacher_id = $2");
  });

  it("student+class filters combine sequentially", async () => {
    const res = await GET(
      makeRequest("page=1&pageSize=20&userId=student-9&classId=class-7"),
    );
    expect(res.status).toBe(200);
    const list = listQuery();
    expect(list.sql).toContain("e.user_id = $2");
    expect(list.sql).toContain("class_id = $3");
    expect(list.values).toEqual(["teacher-1", "student-9", "class-7", 20, 0]);
  });

  it("title search narrows rows and stats but not student options", async () => {
    const res = await GET(makeRequest("page=1&pageSize=20&q=homework"));
    expect(res.status).toBe(200);
    expect(listQuery().sql).toContain("e.title ILIKE $2");
    expect(statsQuery().sql).toContain("e.title ILIKE $2");
    expect(usersQuery().sql).not.toContain("ILIKE");
  });

  it("paging does not add page params to stats", async () => {
    const res = await GET(makeRequest("page=4&pageSize=50"));
    expect(res.status).toBe(200);
    const stats = statsQuery();
    expect(stats.values).toEqual(["teacher-1"]);
    expect(stats.sql).not.toContain("LIMIT $2");
  });
});

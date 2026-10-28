import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// The shared staff filter bar exposes student names and emails, so the route
// must refuse students, scope every query by role, and only narrow by class.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";

vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "u-1", role } } : null),
}));

vi.mock("@/lib/users", () => ({
  getSchoolForUser: async () => "school-1",
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      return { rows: [{ id: "s1", name: "Alice", email: "alice@example.com" }] };
    },
  }),
}));

import { GET } from "./route";

function req(query = "") {
  return {
    nextUrl: new URL(`http://localhost/api/language-check/staff/students?${query}`),
  } as unknown as NextRequest;
}

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
});

describe("staff students route", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect((await GET(req())).status).toBe(401);
    expect(queries).toHaveLength(0);
  });

  it("refuses students without touching the database", async () => {
    role = "student";
    expect((await GET(req())).status).toBe(403);
    expect(queries).toHaveLength(0);
  });

  it("scopes a teacher to the students in their classes", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      users: [{ id: "s1", name: "Alice", email: "alice@example.com" }],
    });
    expect(queries[0].sql).toContain("sc.teacher_id = $1");
    expect(queries[0].values).toEqual(["u-1"]);
  });

  it("scopes an admin to their school", async () => {
    role = "admin";
    await GET(req());
    expect(queries[0].sql).toContain("su.school_id = $1");
    expect(queries[0].values).toEqual(["school-1"]);
  });

  it("does not scope a super-admin, and narrows by class only", async () => {
    role = "super-admin";
    await GET(req("classId=class-7"));
    expect(queries[0].sql).toContain("class_id = $1");
    expect(queries[0].values).toEqual(["class-7"]);
  });

  it("includes learners who only have learning history", async () => {
    await GET(req());
    expect(queries[0].sql).toContain("language_check_essays");
    expect(queries[0].sql).toContain("language_check_learn_events");
  });

  it("all=1 lists every in-scope student, not just those with essays", async () => {
    await GET(req("all=1"));
    // The teacher-upload picker needs first-time learners too, so it reads
    // the users table directly (current, non-banned students only — roles
    // live in user_roles; no row there = implicit student).
    expect(queries[0].sql).toContain("FROM users u");
    expect(queries[0].sql).toContain("LEFT JOIN user_roles ur");
    expect(queries[0].sql).toContain("COALESCE(ur.role, 'student') = 'student'");
    expect(queries[0].sql).toContain("COALESCE(u.banned, FALSE) = FALSE");
    expect(queries[0].sql).not.toContain("language_check_essays");
    expect(queries[0].sql).toContain("ac.teacher_id = $1");
  });

  it("all=1 narrows by class for every scope kind", async () => {
    role = "super-admin";
    await GET(req("all=1&classId=class-9"));
    expect(queries[0].sql).toContain("class_id = $1");
    expect(queries[0].values).toEqual(["class-9"]);
  });

  it("mine=1 narrows to the caller's own classes (the 'My Classes' default)", async () => {
    // Super-admin: no scope clause, so the own-classes membership is $1.
    role = "super-admin";
    await GET(req("all=1&mine=1"));
    expect(queries[0].sql).toContain("FROM class_members mcm");
    expect(queries[0].sql).toContain("mc.teacher_id = $1");
    expect(queries[0].values).toEqual(["u-1"]);
    // Teacher: scope clause first, own-classes membership second.
    role = "teacher";
    await GET(req("all=1&mine=1"));
    expect(queries[1].sql).toContain("mc.teacher_id = $2");
    expect(queries[1].values).toEqual(["u-1", "u-1"]);
  });

  it("mine=1 also narrows the shared filter bar's picker (no all=1)", async () => {
    // The staff filter bar fetches without all=1 — "My Classes" must narrow
    // that path too (regression: `mine` used to be dropped here).
    role = "super-admin";
    await GET(req("mine=1"));
    expect(queries[0].sql).toContain("FROM class_members mcm");
    expect(queries[0].sql).toContain("mc.teacher_id = $1");
    expect(queries[0].values).toEqual(["u-1"]);
  });
});

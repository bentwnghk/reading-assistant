import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Staff delete: DELETE /api/writing-assessment/staff/[id] is open to every
// staff role, like the other staff writers — each strictly inside its own
// scope (teacher → classes they teach, admin → school, super-admin → all).
// Only students are refused. The scope predicate must live INSIDE the
// delete — one statement, no read-then-write window — and an essay outside
// the caller's scope must answer 404 exactly like a missing one.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "admin";
/** Rows matched (and therefore deleted) by the scoped DELETE. */
let deleted = 1;
/** When set, the pool throws it (server failure mid-delete). */
let failure: Error | null = null;

vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "staff-1", role } } : null),
}));

vi.mock("@/lib/users", () => ({
  getSchoolForUser: async () => "school-1",
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      if (failure) throw failure;
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), values: values ?? [] });
      return { rows: [], rowCount: deleted };
    },
  }),
}));

import { DELETE } from "./route";

const request = () => ({ method: "DELETE" }) as unknown as NextRequest;
const ctx = () => ({ params: Promise.resolve({ id: "essay-1" }) });

beforeEach(() => {
  queries.length = 0;
  role = "admin";
  deleted = 1;
  failure = null;
});

describe("DELETE /api/writing-assessment/staff/[id]", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect((await DELETE(request(), ctx())).status).toBe(401);
    expect(queries).toHaveLength(0);
  });

  it("refuses students without touching the database", async () => {
    role = "student";
    expect((await DELETE(request(), ctx())).status).toBe(403);
    expect(queries).toHaveLength(0);
  });

  it("teacher: one scoped DELETE (classes they teach), no read before it", async () => {
    role = "teacher";
    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(200);
    expect(queries).toHaveLength(1);
    const q = queries[0];
    expect(q.sql).toMatch(/^DELETE FROM language_check_essays e USING users u/);
    expect(q.sql).toContain("u.id = e.user_id");
    expect(q.sql).toContain("sc.teacher_id = $1");
    expect(q.sql).toContain("e.id = $2");
    expect(q.values).toEqual(["staff-1", "essay-1"]);
  });

  it("admin: exactly one statement — a DELETE scoped to the school, no read before it", async () => {
    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(queries).toHaveLength(1);
    const q = queries[0];
    // The scope is part of the DELETE itself (no check-then-write window)
    // and reuses the staff list's row set: essays JOIN their owner.
    expect(q.sql).toMatch(/^DELETE FROM language_check_essays e USING users u/);
    expect(q.sql).toContain("u.id = e.user_id");
    expect(q.sql).toContain("u.school_id = $1");
    expect(q.sql).toContain("e.id = $2");
    expect(q.values).toEqual(["school-1", "essay-1"]);
  });

  it("super-admin: the essay id is the only parameter — no scope clause", async () => {
    role = "super-admin";
    expect((await DELETE(request(), ctx())).status).toBe(200);
    const q = queries[0];
    expect(q.sql).toMatch(/^DELETE FROM language_check_essays e USING users u/);
    expect(q.sql).not.toContain("school_id");
    expect(q.sql).not.toContain("teacher_id");
    expect(q.sql).toContain("e.id = $1");
    expect(q.values).toEqual(["essay-1"]);
  });

  it.each(["teacher", "admin", "super-admin"])(
    "%s: an essay outside the scope (or missing) is a 404 — only the scoped DELETE ran",
    async (r) => {
      role = r;
      deleted = 0;
      const res = await DELETE(request(), ctx());
      expect(res.status).toBe(404);
      expect(queries).toHaveLength(1);
      expect(queries[0].sql.startsWith("DELETE")).toBe(true);
    },
  );

  it("a failed delete surfaces as 500", async () => {
    failure = new Error("connection lost");
    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(500);
  });
});

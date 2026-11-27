import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Topic-report detail route. GET serves the report plus `canDelete` (the
// Topic Library delete rule: the creator always; admins / super-admins for a
// topic their library shows), and DELETE removes the report's TOPIC itself
// with the same scope predicate INSIDE the delete — one statement, no
// read-then-write window — so an out-of-scope topic answers 404 exactly like
// a missing one. Teachers may delete their own topics (same right as the
// Topic Library).

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";
/** Rows matched (and therefore deleted) by the scoped DELETE. */
let deleted = 1;
/** When false, the topic row is missing / not viewer-visible. */
let topicFound = true;
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
      const norm = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: norm, values: values ?? [] });
      // canViewTopic / canDeleteTopic: the topic is viewer-visible.
      if (norm.startsWith("SELECT 1 FROM language_check_topics")) {
        return { rows: [], rowCount: topicFound ? 1 : 0 };
      }
      // The scoped DELETE itself.
      if (norm.startsWith("DELETE FROM language_check_topics")) {
        return { rows: [], rowCount: deleted };
      }
      // TOPIC_ROW_SQL: one live topic (no class).
      if (norm.includes("FROM language_check_topics t")) {
        return {
          rows: topicFound
            ? [
                {
                  id: "topic-1",
                  title: "My topic",
                  topic: "Write about a memorable day",
                  essay_type: "dse-part-a",
                  class_id: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                  has_image: false,
                  class_name: null,
                  creator_name: "",
                  student_count: 0,
                },
              ]
            : [],
        };
      }
      // Essay aggregates / sweeps / scope helpers.
      return { rows: [], rowCount: 0 };
    },
  }),
}));

import { DELETE, GET } from "./route";

const request = () => ({ method: "DELETE" }) as unknown as NextRequest;
const ctx = () => ({ params: Promise.resolve({ id: "topic-1" }) });

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
  deleted = 1;
  topicFound = true;
  failure = null;
});

describe("DELETE /api/writing-assessment/staff/topic-reports/[id]", () => {
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

  it("teacher: exactly one statement — the DELETE scoped to their own topics", async () => {
    const res = await DELETE(request(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(queries).toHaveLength(1);
    const q = queries[0];
    // The scope is part of the DELETE itself (no check-then-write window).
    expect(q.sql).toMatch(/^DELETE FROM language_check_topics WHERE id = \$1 AND user_id = \$2$/);
    expect(q.values).toEqual(["topic-1", "staff-1"]);
  });

  it("admin: the scope reaches the school's class topics", async () => {
    role = "admin";
    expect((await DELETE(request(), ctx())).status).toBe(200);
    const q = queries[0];
    expect(q.sql).toContain(
      "class_id IN (SELECT id FROM classes WHERE school_id = $3)",
    );
    expect(q.values).toEqual(["topic-1", "staff-1", "school-1"]);
  });

  it("super-admin: no scope clause beyond ownership", async () => {
    role = "super-admin";
    expect((await DELETE(request(), ctx())).status).toBe(200);
    const q = queries[0];
    expect(q.sql).toContain("class_id IN (SELECT id FROM classes)");
    expect(q.sql).not.toContain("school_id");
    expect(q.sql).not.toContain("teacher_id");
    expect(q.values).toEqual(["topic-1", "staff-1"]);
  });

  it.each(["teacher", "admin", "super-admin"])(
    "%s: a topic outside the scope (or missing) is a 404 — only the scoped DELETE ran",
    async (r) => {
      role = r;
      deleted = 0;
      const res = await DELETE(request(), ctx());
      expect(res.status).toBe(404);
      expect(queries).toHaveLength(1);
      expect(queries[0].sql.startsWith("DELETE FROM language_check_topics")).toBe(true);
    },
  );

  it("a failed delete surfaces as 500", async () => {
    failure = new Error("connection lost");
    expect((await DELETE(request(), ctx())).status).toBe(500);
  });
});

describe("GET /api/writing-assessment/staff/topic-reports/[id]", () => {
  it("serves the report plus the server-computed canDelete flag", async () => {
    const res = await GET(request(), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topic.id).toBe("topic-1");
    expect(body.canDelete).toBe(true);
    // The affordance is derived from the SAME rule the delete enforces
    // (`canDeleteTopic`: topic-id + creator, no class-scope params).
    const canDelete = queries.find((q) =>
      /^SELECT 1 FROM language_check_topics WHERE id = \$1 AND user_id = \$2$/.test(q.sql),
    )!;
    expect(canDelete.values).toEqual(["topic-1", "staff-1"]);
  });

  it("a missing / unreadable topic is a 404", async () => {
    topicFound = false;
    expect((await GET(request(), ctx())).status).toBe(404);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Class-assigned topics: the list/read scope mirrors /api/classes (students →
// classes they belong to, teachers → classes they teach, admins → school,
// super-admins → all), a class target must be within that scope, and the
// creator may update/delete. Admins and super-admins may additionally
// update/delete every topic their own Topic Library shows.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";
/** canAssignTopicClass result: 1 = the class is within the caller's scope. */
let assignRows = 1;
/** update/delete rowCount: 0 = the topic is outside the caller's write scope. */
let writeRows = 1;
/** Rows returned by the single-topic fetch: [] = invisible to the caller. */
let singleRows: unknown[] | null = null;

const topicRow = (over: Record<string, unknown> = {}) => ({
  id: "topic-1",
  title: "S6 Writing 1",
  topic: "Write a letter",
  essay_type: "dse-part-a",
  has_image: false,
  user_id: "teacher-1",
  class_id: "class-1",
  class_name: "S5 · English · Gp1",
  creator_name: "",
  question_image: "",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  ...over,
});

vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "u-1", role } } : null),
}));

vi.mock("@/lib/users", () => ({
  getSchoolForUser: async () => "school-1",
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      const flat = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: flat, values: values ?? [] });
      if (flat.startsWith("SELECT 1 FROM classes"))
        return { rows: [], rowCount: assignRows };
      // list query (own + class topics, own first)
      if (flat.includes("FROM language_check_topics") && flat.includes("ORDER BY"))
        return { rows: [topicRow()] };
      if (flat.startsWith("INSERT INTO language_check_topics"))
        return { rows: [{ id: "t-new" }] };
      if (flat.startsWith("UPDATE language_check_topics"))
        return { rows: [], rowCount: writeRows };
      if (flat.startsWith("DELETE FROM language_check_topics"))
        return { rows: [], rowCount: writeRows };
      if (flat.includes("COUNT(*)::int AS n")) return { rows: [{ n: 0 }] };
      // single-topic fetch (list/read-back)
      if (flat.includes("FROM language_check_topics"))
        return { rows: singleRows ?? [topicRow()] };
      return { rows: [], rowCount: 0 };
    },
  }),
}));

import { GET as listGET, POST } from "./route";
import { GET, PUT, DELETE } from "./[id]/route";

const body = (over: Record<string, unknown> = {}) => ({
  title: "S6 Writing 1",
  topic: "Write a letter",
  essayType: "dse-part-a",
  questionImage: "",
  ...over,
});

function req(method: string, payload?: unknown, id = "topic-1") {
  return {
    method,
    json: async () => payload,
    nextUrl: new URL(`http://localhost/api/writing-assessment/topics/${id}`),
  } as unknown as NextRequest;
}

function ctx(id = "topic-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
  assignRows = 1;
  writeRows = 1;
  singleRows = null;
});

describe("GET /api/writing-assessment/topics (visibility)", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect((await listGET()).status).toBe(401);
    expect(queries).toHaveLength(0);
  });

  it("scopes a student to topics of the classes they belong to", async () => {
    role = "student";
    expect((await listGET()).status).toBe(200);
    const q = queries[0];
    expect(q.sql).toContain("t.user_id = $1 OR t.class_id IN");
    expect(q.sql).toContain(
      "SELECT class_id FROM class_members WHERE student_id = $2",
    );
    expect(q.values).toEqual(["u-1", "u-1"]);
    // Own topics always stay on the list, ahead of class topics.
    expect(q.sql).toContain("(t.user_id = $1) DESC");
  });

  it("scopes a teacher to topics of the classes they teach", async () => {
    const res = await listGET();
    expect(res.status).toBe(200);
    const topics = (await res.json()) as LanguageCheckTopicSummary[];
    expect(topics[0].classId).toBe("class-1");
    expect(topics[0].className).toBe("S5 · English · Gp1");
    expect(queries[0].sql).toContain("SELECT id FROM classes WHERE teacher_id = $2");
    expect(queries[0].values).toEqual(["u-1", "u-1"]);
  });

  it("scopes an admin to the topics of their school's classes", async () => {
    role = "admin";
    expect((await listGET()).status).toBe(200);
    expect(queries[0].sql).toContain("SELECT id FROM classes WHERE school_id = $2");
    expect(queries[0].values).toEqual(["u-1", "school-1"]);
  });

  it("lets a super-admin see every class topic (no scope params)", async () => {
    role = "super-admin";
    expect((await listGET()).status).toBe(200);
    expect(queries[0].sql).toContain("t.class_id IN (SELECT id FROM classes)");
    expect(queries[0].values).toEqual(["u-1"]);
  });
});

describe("POST /api/writing-assessment/topics (class target)", () => {
  it("rejects a class the caller cannot target", async () => {
    role = "student";
    assignRows = 0;
    const res = await POST(req("POST", body({ classId: "foreign-class" })));
    expect(res.status).toBe(403);
    expect(queries.find((q) => q.sql.startsWith("INSERT"))).toBeUndefined();
    // Membership check: the student must belong to the class.
    const check = queries.find((q) => q.sql.startsWith("SELECT 1 FROM classes"))!;
    expect(check.sql).toContain("tcm.student_id = $1");
    expect(check.values[1]).toBe("foreign-class");
  });

  it("creates a topic for an allowed class", async () => {
    const res = await POST(req("POST", body({ classId: "class-1" })));
    expect(res.status).toBe(201);
    const insert = queries.find((q) => q.sql.startsWith("INSERT"))!;
    expect(insert.values[5]).toBe("class-1");
  });

  it("stores a personal topic without a class scope check", async () => {
    const res = await POST(req("POST", body({ classId: null })));
    expect(res.status).toBe(201);
    expect(
      queries.find((q) => q.sql.startsWith("SELECT 1 FROM classes")),
    ).toBeUndefined();
    const insert = queries.find((q) => q.sql.startsWith("INSERT"))!;
    expect(insert.values[5]).toBeNull();
  });
});

describe("topics/[id] (read / update / delete)", () => {
  it("lets a student read a topic assigned to their class", async () => {
    role = "student";
    const res = await GET(req("GET"), ctx());
    expect(res.status).toBe(200);
    const topic = (await res.json()) as LanguageCheckTopic;
    expect(topic.classId).toBe("class-1");
    expect(topic.questionImage).toBe("");
    expect(queries[0].sql).toContain("(t.user_id = $2 OR t.class_id IN");
    expect(queries[0].sql).toContain(
      "SELECT class_id FROM class_members WHERE student_id = $3",
    );
  });

  it("hides another user's topic from an out-of-scope reader", async () => {
    role = "student";
    singleRows = []; // not the creator, not in the class
    const res = await GET(req("GET"), ctx("not-visible"));
    expect(res.status).toBe(404);
    expect(queries[0].values[0]).toBe("not-visible");
  });

  it("refuses updates from anyone but the creator", async () => {
    role = "student";
    writeRows = 0;
    const res = await PUT(req("PUT", body()), ctx());
    expect(res.status).toBe(404);
    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    // Creator-only predicate — no class scope for a student.
    expect(update.sql).toContain("WHERE id = $6 AND user_id = $7");
    expect(update.sql).not.toContain("class_id IN");
  });

  it("keeps a teacher on the creator-only rule, even for their own class", async () => {
    role = "teacher";
    writeRows = 0;
    // class-1 is the teacher's own class, but they did not create the topic.
    const res = await PUT(req("PUT", body({ classId: "class-1" })), ctx());
    expect(res.status).toBe(404);
    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    expect(update.sql).toContain("WHERE id = $6 AND user_id = $7");
    expect(update.sql).not.toContain("class_id IN");
  });

  it("lets the creator move a topic to a class they may target", async () => {
    const res = await PUT(req("PUT", body({ classId: "class-1" })), ctx());
    expect(res.status).toBe(200);
    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    // Data placeholders first (title … classId), then the id and the scope.
    expect(update.values).toEqual([
      "S6 Writing 1",
      "Write a letter",
      "dse-part-a",
      "",
      "class-1",
      "topic-1",
      "u-1",
    ]);
  });

  it("lets an admin update a topic they did not create", async () => {
    role = "admin";
    const res = await PUT(req("PUT", body({ title: "Fixed" })), ctx());
    expect(res.status).toBe(200);
    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    // Creator OR any class topic of the admin's school (their library).
    expect(update.sql).toContain(
      "WHERE id = $6 AND (user_id = $7 OR class_id IN (SELECT id FROM classes WHERE school_id = $8))",
    );
    expect(update.values.slice(5)).toEqual(["topic-1", "u-1", "school-1"]);
    // The read-back is by id alone (scoped to nothing): the saved row may
    // have just left the writer's library, e.g. an admin making another
    // user's class topic personal. The caller still drives the creator label.
    const readBack = queries.find((q) => q.sql.endsWith("WHERE t.id = $1"))!;
    expect(readBack.values).toEqual(["topic-1", "u-1"]);
  });

  it("lets a super-admin update any class topic", async () => {
    role = "super-admin";
    expect((await PUT(req("PUT", body()), ctx())).status).toBe(200);
    const update = queries.find((q) => q.sql.startsWith("UPDATE"))!;
    expect(update.sql).toContain(
      "(user_id = $7 OR class_id IN (SELECT id FROM classes))",
    );
    // Every class — no scope parameter.
    expect(update.values.slice(5)).toEqual(["topic-1", "u-1"]);
  });

  it("returns 404 when an admin's target lies outside their library", async () => {
    role = "admin";
    writeRows = 0;
    expect((await PUT(req("PUT", body()), ctx())).status).toBe(404);
    expect((await DELETE(req("DELETE"), ctx())).status).toBe(404);
  });

  it("still stops an admin from retargeting a topic to a foreign class", async () => {
    role = "admin";
    assignRows = 0;
    const res = await PUT(req("PUT", body({ classId: "other-school-class" })), ctx());
    expect(res.status).toBe(403);
    expect(queries.find((q) => q.sql.startsWith("UPDATE"))).toBeUndefined();
  });

  it("refuses deletes from anyone but the creator", async () => {
    role = "teacher";
    writeRows = 0;
    const res = await DELETE(req("DELETE"), ctx());
    expect(res.status).toBe(404);
    const del = queries.find((q) => q.sql.startsWith("DELETE"))!;
    expect(del.sql).toBe(
      "DELETE FROM language_check_topics WHERE id = $1 AND user_id = $2",
    );
    expect(del.values).toEqual(["topic-1", "u-1"]);
  });

  it("lets an admin delete a topic they did not create", async () => {
    role = "admin";
    const res = await DELETE(req("DELETE"), ctx());
    expect(res.status).toBe(200);
    const del = queries.find((q) => q.sql.startsWith("DELETE"))!;
    expect(del.sql).toContain(
      "WHERE id = $1 AND (user_id = $2 OR class_id IN (SELECT id FROM classes WHERE school_id = $3))",
    );
    expect(del.values).toEqual(["topic-1", "u-1", "school-1"]);
  });
});

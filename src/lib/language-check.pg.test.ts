// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";

// Real-Postgres tests of the staff essay delete. They need the in-process
// engine, which is deliberately NOT a project dependency:
// `npm i --no-save @electric-sql/pglite` to run them; otherwise they are skipped.
type Db = {
  query: (sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
  exec: (sql: string) => Promise<unknown>;
};
let db: Db = undefined as unknown as Db;
let pgliteMissing = false;
try {
  const moduleName = "@electric-sql/pglite";
  const { PGlite } = await import(/* @vite-ignore */ moduleName);
  db = new PGlite() as Db;
} catch {
  pgliteMissing = true;
}
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: (sql: string, values?: unknown[]) => db.query(sql, values) }),
}));

// getSchoolForUser normally goes through getClient(); resolve it from the
// seeded users table instead so the admin scope runs the real SQL path.
vi.mock("@/lib/users", () => ({
  getSchoolForUser: async (userId: string) => {
    const res = await db.query("SELECT school_id FROM users WHERE id = $1", [
      userId,
    ]);
    return (res.rows[0] as { school_id: string | null } | undefined)?.school_id ?? null;
  },
}));

import * as lc from "@/lib/language-check";

beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, school_id TEXT);
    CREATE TABLE classes (id TEXT PRIMARY KEY, name TEXT, teacher_id TEXT, school_id TEXT);
    CREATE TABLE class_members (class_id TEXT, student_id TEXT);
    CREATE TABLE language_check_topics (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '');
    -- Column-faithful copy of the essay table (minus the updated_at trigger).
    CREATE TABLE language_check_essays (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      uploaded_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      title          TEXT NOT NULL DEFAULT '',
      images         JSONB NOT NULL DEFAULT '[]'::jsonb,
      transcript     TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'draft',
      checked_text   TEXT NOT NULL DEFAULT '',
      corrections    JSONB NOT NULL DEFAULT '[]'::jsonb,
      ocr_model      TEXT NOT NULL DEFAULT '',
      check_model    TEXT NOT NULL DEFAULT '',
      dropped_count  INTEGER NOT NULL DEFAULT 0,
      assessment     JSONB,
      enhanced       JSONB,
      topic_id       TEXT REFERENCES language_check_topics(id) ON DELETE SET NULL,
      topic          TEXT NOT NULL DEFAULT '',
      essay_type     TEXT NOT NULL DEFAULT '',
      question_image TEXT NOT NULL DEFAULT '',
      created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    -- Only the columns the delete's side effects are asserted on.
    CREATE TABLE language_check_learn_sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      essay_id    TEXT REFERENCES language_check_essays(id) ON DELETE SET NULL,
      essay_title TEXT NOT NULL DEFAULT ''
    );

    INSERT INTO users (id, name, email, school_id) VALUES
      ('a1', 'Admin One', 'a1@example.com', 'sc1'),
      ('a2', 'Admin Two', 'a2@example.com', 'sc2'),
      ('a0', 'Unprovisioned Admin', 'a0@example.com', NULL),
      ('root', 'Root', 'root@example.com', NULL),
      ('t1', 'Ms Chan', 't1@example.com', 'sc1'),
      ('s1', 'Amy', 's1@example.com', 'sc1'),
      ('s2', 'Ben', 's2@example.com', 'sc2'),
      ('s0', 'Nowhere', 's0@example.com', NULL);
    INSERT INTO classes (id, name, teacher_id, school_id) VALUES
      ('c1', 'Gp1', 't1', 'sc1');
    INSERT INTO class_members (class_id, student_id) VALUES
      ('c1', 's1');
  `);
});

const itDb = pgliteMissing ? it.skip : it;

async function addEssay(id: string, ownerId: string, uploadedBy: string | null = null) {
  await db.query(
    `INSERT INTO language_check_essays (id, user_id, uploaded_by, title, status)
     VALUES ($1, $2, $3, $4, 'checked')`,
    [id, ownerId, uploadedBy, `Essay ${id}`],
  );
}

async function essayExists(id: string): Promise<boolean> {
  const res = await db.query("SELECT 1 FROM language_check_essays WHERE id = $1", [id]);
  return res.rows.length > 0;
}

describe("deleteStaffEssay against real Postgres", () => {
  itDb("an admin deletes any essay in their school — a student's, a teacher-uploaded one, a colleague's", async () => {
    await addEssay("e-student", "s1", "a1");
    await addEssay("e-colleague", "t1");
    const scope = await lc.resolveStaffScope("admin", "a1");
    expect(scope).toEqual({ kind: "school", schoolId: "sc1" });
    expect(await lc.deleteStaffEssay(scope!, "e-student")).toBe(true);
    expect(await lc.deleteStaffEssay(scope!, "e-colleague")).toBe(true);
    expect(await essayExists("e-student")).toBe(false);
    expect(await essayExists("e-colleague")).toBe(false);
  });

  itDb("an admin cannot reach essays outside their school", async () => {
    await addEssay("e-other-school", "s2");
    await addEssay("e-no-school", "s0");
    const scope = await lc.resolveStaffScope("admin", "a1");
    expect(await lc.deleteStaffEssay(scope!, "e-other-school")).toBe(false);
    expect(await lc.deleteStaffEssay(scope!, "e-no-school")).toBe(false);
    // Both rows are untouched.
    expect(await essayExists("e-other-school")).toBe(true);
    expect(await essayExists("e-no-school")).toBe(true);
  });

  itDb("an admin without a school deletes nothing — not even essays of other school-less users", async () => {
    await addEssay("e-orphan", "s0");
    const scope = await lc.resolveStaffScope("admin", "a0");
    // No school resolves to an empty school id, which matches no row.
    expect(scope).toEqual({ kind: "school", schoolId: "" });
    expect(await lc.deleteStaffEssay(scope!, "e-orphan")).toBe(false);
    expect(await essayExists("e-orphan")).toBe(true);
  });

  itDb("a super-admin deletes across schools", async () => {
    await addEssay("e-sc2", "s2");
    const scope = await lc.resolveStaffScope("super-admin", "root");
    expect(scope).toEqual({ kind: "all" });
    expect(await lc.deleteStaffEssay(scope!, "e-sc2")).toBe(true);
    expect(await essayExists("e-sc2")).toBe(false);
  });

  itDb("a teacher scope never deletes — even an essay the teacher can see", async () => {
    await addEssay("e-own-class", "s1");
    const teacher = await lc.resolveStaffScope("teacher", "t1");
    expect(teacher).toEqual({ kind: "teacher", teacherId: "t1" });
    // Amy is in the teacher's class: the essay is inside the teacher's VIEW
    // scope …
    expect(await lc.getStaffEssay(teacher!, "e-own-class")).not.toBeNull();
    // … and still cannot be deleted with that scope.
    expect(await lc.deleteStaffEssay(teacher!, "e-own-class")).toBe(false);
    expect(await essayExists("e-own-class")).toBe(true);
  });

  itDb("a missing essay is a plain false", async () => {
    const scope = await lc.resolveStaffScope("admin", "a1");
    expect(await lc.deleteStaffEssay(scope!, "nope")).toBe(false);
  });

  itDb("learning sessions built from the essay are kept, detached", async () => {
    await addEssay("e-learn", "s1");
    await db.query(
      `INSERT INTO language_check_learn_sessions (id, user_id, essay_id, essay_title)
       VALUES ('ls1', 's1', 'e-learn', 'Essay e-learn')`,
    );
    const scope = await lc.resolveStaffScope("admin", "a1");
    expect(await lc.deleteStaffEssay(scope!, "e-learn")).toBe(true);
    const res = await db.query(
      `SELECT id, essay_id, essay_title FROM language_check_learn_sessions WHERE id = 'ls1'`,
    );
    expect(res.rows).toEqual([
      { id: "ls1", essay_id: null, essay_title: "Essay e-learn" },
    ]);
  });
});

describe("canDeleteStudentEssays", () => {
  it.each(["admin", "super-admin"])("allows %s", (role) => {
    expect(lc.canDeleteStudentEssays(role)).toBe(true);
  });

  it.each(["teacher", "student", "", null, undefined])(
    "refuses %s",
    (role) => {
      expect(lc.canDeleteStudentEssays(role)).toBe(false);
    },
  );
});

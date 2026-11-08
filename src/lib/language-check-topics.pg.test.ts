// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";

// Real-Postgres tests of the class-assigned topic SQL. They need the
// in-process engine, which is deliberately NOT a project dependency:
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

import * as topics from "@/lib/language-check-topics";

beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, school_id TEXT);
    CREATE TABLE classes (
      id TEXT PRIMARY KEY, name TEXT, teacher_id TEXT, school_id TEXT,
      subject_id TEXT, grade_id TEXT
    );
    CREATE TABLE subjects (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE grades (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE class_members (class_id TEXT, student_id TEXT);
    CREATE TABLE language_check_topics (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      essay_type TEXT NOT NULL,
      question_image TEXT NOT NULL DEFAULT '',
      class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO users (id, name, school_id) VALUES
      ('t1', 'Ms Chan', 'sc1'),
      ('a1', 'Admin', 'sc1'),
      ('root', 'Root', NULL),
      ('s1', 'Amy', 'sc1'),
      ('s2', 'Ben', 'sc1');
    INSERT INTO subjects VALUES ('eng', 'English');
    INSERT INTO grades VALUES ('s5', 'S5');
    INSERT INTO classes (id, name, teacher_id, school_id, subject_id, grade_id) VALUES
      ('c1', 'Gp1', 't1', 'sc1', 'eng', 's5'),
      ('c2', 'Gp2', 't1', 'sc1', NULL, NULL),
      ('c3', 'Other School', 'other-t', 'sc2', NULL, NULL);
    INSERT INTO class_members (class_id, student_id) VALUES
      ('c1', 's1'), ('c2', 's1'), ('c1', 'other-s');

    INSERT INTO language_check_topics (id, user_id, title, topic, essay_type, class_id) VALUES
      ('own', 's1', 'My own', 'P', 'dse-part-a', NULL),
      ('own-class', 's1', 'My class topic', 'P', 'dse-part-a', 'c1'),
      ('teacher-c1', 't1', 'Teacher C1', 'P', 'dse-part-a', 'c1'),
      ('teacher-c2', 't1', 'Teacher C2', 'P', 'dse-part-b', 'c2'),
      ('teacher-none', 't1', 'Teacher personal', 'P', 'dse-part-a', NULL),
      ('other-school', 'other-t', 'Elsewhere', 'P', 'dse-part-a', 'c3');
  `);
});

const itDb = pgliteMissing ? it.skip : it;

describe("language-check-topics against real Postgres", () => {
  itDb("student sees own + their classes' topics, own first", async () => {
    const list = await topics.listTopics({ id: "s1", role: "student" });
    const ids = list.map((t) => t.id);
    // Own topics (incl. own class topic) come before the teacher's class
    // topics; other classes and other schools stay hidden.
    expect(ids).toEqual(["own", "own-class", "teacher-c1", "teacher-c2"]);
    const withClass = list.find((t) => t.id === "teacher-c1")!;
    expect(withClass.classId).toBe("c1");
    expect(withClass.className).toBe("S5 · English · Gp1");
    expect(withClass.userId).toBe("t1");
    expect(withClass.creatorName).toBe("Ms Chan");
    // Own topics never carry a creator label.
    expect(list.find((t) => t.id === "own")!.creatorName).toBeNull();
  });

  itDb("teacher sees their own topics plus topics targeting their classes", async () => {
    const list = await topics.listTopics({ id: "t1", role: "teacher" });
    const ids = list.map((t) => t.id);
    expect(ids).toContain("teacher-none");
    expect(ids).toContain("own-class"); // student created it for the teacher's class
    expect(ids).not.toContain("other-school");
  });

  itDb("admin sees school classes' topics; super-admin sees all", async () => {
    const admin = await topics.listTopics({ id: "a1", role: "admin" });
    const adminIds = admin.map((t) => t.id);
    // School sc1's classes are c1 + c2 — their topics, and only those.
    expect(adminIds).toEqual(["own-class", "teacher-c1", "teacher-c2"]);
    expect(adminIds).not.toContain("teacher-none"); // personal to t1
    expect(adminIds).not.toContain("other-school"); // sc2 class
    const root = await topics.listTopics({ id: "root", role: "super-admin" });
    const rootIds = root.map((t) => t.id).sort();
    // Every CLASS topic is visible; other users' personal topics are not.
    expect(rootIds).toEqual(["other-school", "own-class", "teacher-c1", "teacher-c2"]);
  });

  itDb("getTopic is readable via class membership and snapshots the image", async () => {
    const topic = await topics.getTopic({ id: "s1", role: "student" }, "teacher-c1");
    expect(topic?.title).toBe("Teacher C1");
    expect(topic?.questionImage).toBe("");
    const denied = await topics.getTopic({ id: "s2", role: "student" }, "teacher-c1");
    expect(denied).toBeNull();
  });

  itDb("class targeting is limited to the viewer's scope", async () => {
    expect(await topics.canAssignTopicClass({ id: "s1", role: "student" }, "c1")).toBe(true);
    expect(await topics.canAssignTopicClass({ id: "s1", role: "student" }, "c3")).toBe(false);
    expect(await topics.canAssignTopicClass({ id: "t1", role: "teacher" }, "c2")).toBe(true);
    expect(await topics.canAssignTopicClass({ id: "t1", role: "teacher" }, "c3")).toBe(false);
    expect(await topics.canAssignTopicClass({ id: "a1", role: "admin" }, "c1")).toBe(true);
    expect(await topics.canAssignTopicClass({ id: "a1", role: "admin" }, "c3")).toBe(false);
    expect(await topics.canAssignTopicClass({ id: "root", role: "super-admin" }, "c3")).toBe(true);
    // Unknown class ids never pass.
    expect(await topics.canAssignTopicClass({ id: "root", role: "super-admin" }, "nope")).toBe(false);
  });

  itDb("create/update/delete stay creator-scoped and persist the class", async () => {
    const created = await topics.createTopic("t1", {
      title: "New",
      topic: "P",
      essayType: "dse-part-a",
      questionImage: "",
      classId: "c1",
    });
    expect(created.classId).toBe("c1");
    // Another user cannot edit or delete it.
    expect(
      await topics.updateTopic("s1", created.id, {
        title: "X",
        topic: "P",
        essayType: "dse-part-a",
        questionImage: "",
        classId: null,
      }),
    ).toBeNull();
    expect(await topics.deleteTopic("s1", created.id)).toBe(false);
    // The creator can detach the class (back to personal).
    const updated = await topics.updateTopic("t1", created.id, {
      title: "New",
      topic: "P",
      essayType: "dse-part-a",
      questionImage: "",
      classId: null,
    });
    expect(updated?.classId).toBeNull();
    expect(await topics.deleteTopic("t1", created.id)).toBe(true);
  });

  itDb("deleting a class detaches its topics instead of deleting them", async () => {
    await db.exec("DELETE FROM classes WHERE id = 'c2'");
    const list = await topics.listTopics({ id: "s1", role: "student" });
    const detached = list.find((t) => t.id === "teacher-c2");
    // Still there for the creator (t1 teaches it), now personal.
    const teacherList = await topics.listTopics({ id: "t1", role: "teacher" });
    expect(teacherList.find((t) => t.id === "teacher-c2")).toBeDefined();
    expect(detached).toBeUndefined(); // the student no longer sees it
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "fs";

// Real-Postgres tests. They need the in-process engine, which is deliberately
// NOT a project dependency: `npm i --no-save @electric-sql/pglite` to run them;
// without it the suite is skipped (the pure-logic tests always run).
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
// PGlite has ONE connection: interleaved BEGINs would corrupt each other, which
// real pooled connections never do. Serialise client checkouts to emulate the
// ordering the row / advisory locks give (this does NOT prove the lock itself).
let tail: Promise<void> = Promise.resolve();
vi.mock("@/lib/db", () => {
  const q = (sql: string, values?: unknown[]) => db.query(sql, values);
  return {
    getPool: () => ({ query: q }),
    getClient: async () => {
      let release!: () => void;
      const mine = new Promise<void>((r) => (release = r));
      const prev = tail;
      tail = prev.then(() => mine);
      await prev;
      return { query: q, release };
    },
  };
});
vi.mock("@/lib/users", () => ({ getSchoolForUser: async () => "school-1" }));

import * as lib from "@/lib/language-check-learn";
import type { LearnLesson } from "@/utils/languageCheckLearn";

const ESSAY_TEXT = "She go to school. He have a book. I goed home.";
const corrections = [
  { id: "1", start: 4, end: 6, original: "go", correction: "goes", category: "subject-verb-agreement", explanation: "x", explanationZh: "x" },
  { id: "2", start: 19, end: 23, original: "have", correction: "has", category: "subject-verb-agreement", explanation: "x", explanationZh: "x" },
  { id: "3", start: 36, end: 41, original: "goed", correction: "went", category: "tense", explanation: "x", explanationZh: "x" },
];

beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(`
    CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE ROLE reading_user;
    CREATE TABLE users (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, email TEXT UNIQUE, school_id TEXT);
    CREATE TABLE classes (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, teacher_id TEXT, school_id TEXT);
    CREATE TABLE class_members (class_id TEXT, student_id TEXT, PRIMARY KEY (class_id, student_id));
    CREATE TABLE language_check_essays (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '', images JSONB NOT NULL DEFAULT '[]', transcript TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft', checked_text TEXT NOT NULL DEFAULT '', corrections JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
  `);
  await db.exec(fs.readFileSync("scripts/add-language-check-learn.sql", "utf8"));
  await db.exec(`
    INSERT INTO users (id,name,email,school_id) VALUES ('s1','Amy','amy@x','school-1'),('s2','Ben','ben@x','school-1'),('t1','Teacher','t@x','school-1'),('t2','Other','o@x','school-1');
    INSERT INTO classes (id,name,teacher_id) VALUES ('c1','4A','t1'),('c2','4B','t2');
    INSERT INTO class_members VALUES ('c1','s1'),('c2','s2');
  `);
  for (const [id, user] of [["e1", "s1"], ["e2", "s2"]]) {
    await db.query(
      `INSERT INTO language_check_essays (id,user_id,title,status,checked_text,corrections) VALUES ($1,$2,'Essay','checked',$3,$4::jsonb)`,
      [id, user, ESSAY_TEXT, JSON.stringify(corrections)],
    );
  }
  await db.query(`INSERT INTO language_check_essays (id,user_id,title,status) VALUES ('e3','s1','Draft','draft')`);
});

const choice = (id: string, answer = "goes") => ({
  id, type: "choice" as const, question: "She ___ home.", options: ["go", "goes"], answer, hint: "", explanation: "", explanationZh: "",
});
const lesson: LearnLesson = { title: "T", titleZh: "", summary: "S", summaryZh: "", whyItMatters: "", whyItMattersZh: "", rules: [{ heading: "h", headingZh: "", explanation: "e", explanationZh: "", pattern: "", examples: [] }], contrasts: [], chineseTransfer: null, tips: [] };

describe.skipIf(pgliteMissing)("learn persistence against real Postgres", () => {
  let sessionId = "";

  it("start rejects foreign / unchecked essays and no-mistake categories", async () => {
    expect(await lib.startSession("s1", { essayId: "e2", categories: ["tense"], age: 15 })).toMatchObject({ ok: false, reason: "essay-not-found" });
    expect(await lib.startSession("s1", { essayId: "e3", categories: ["tense"], age: 15 })).toMatchObject({ ok: false, reason: "essay-not-checked" });
    expect(await lib.startSession("s1", { essayId: "e1", categories: ["spelling"], age: 15 })).toMatchObject({ ok: false, reason: "no-mistakes" });
  });

  it("start builds units from the stored essay; same selection resumes (even concurrently)", async () => {
    const [a, b] = await Promise.all([
      lib.startSession("s1", { essayId: "e1", categories: ["tense", "subject-verb-agreement"], age: 15 }),
      lib.startSession("s1", { essayId: "e1", categories: ["subject-verb-agreement", "tense"], age: 15 }),
    ]);
    if (!a.ok || !b.ok) throw new Error("start failed");
    expect(a.session.id).toBe(b.session.id);
    expect([a.resumed, b.resumed].sort()).toEqual([false, true]);
    sessionId = a.session.id;
    expect(a.session.units.map((u) => u.category)).toEqual(["subject-verb-agreement", "tense"]);
    expect(a.session.units[0].mistakeCount).toBe(2);
    expect(a.session.units[0].samples[0].sentence).toContain("She go to school");
  });

  it("save merges content/results, derives events once, re-grades the quiz, archives rounds", async () => {
    const patch = {
      current: { unit: 0, stage: "quiz" as const },
      units: [{
        category: "subject-verb-agreement" as const,
        lesson, lessonSeen: true,
        practice: [choice("p0-1"), choice("p0-2")],
        practiceResults: { "p0-1": { score: 1, attempts: 1, completed: true }, "p0-2": { score: 0, attempts: 2, completed: true, revealed: true } },
        quiz: [choice("q1-1"), choice("q1-2")],
        // The client LIES: claims score 1 / correct for a wrong answer.
        quizResults: { "q1-1": { answer: "goes", score: 1, correct: true }, "q1-2": { answer: "go", score: 1, correct: true } },
      }],
    };
    const first = await lib.syncSession("s1", sessionId, patch);
    const unit = first!.session.units[0];
    expect(unit.quizResults["q1-2"]).toMatchObject({ score: 0, correct: false });
    expect(first!.rounds).toHaveLength(1);
    expect(first!.rounds[0]).toMatchObject({ category: "subject-verb-agreement", round: 1, percent: 50, mastery: "developing" });

    // Replay: nothing is logged twice.
    await lib.syncSession("s1", sessionId, patch);
    const feed = await lib.listEvents({ kind: "self", userId: "s1" }, { range: 0, page: 1, pageSize: 100 });
    const count = (t: string) => feed.rows.filter((r) => r.type === t).length;
    expect(count("session_started")).toBe(1);
    expect(count("lesson_generated")).toBe(1);
    expect(count("lesson_viewed")).toBe(1);
    expect(count("practice_answered")).toBe(2);
    expect(count("practice_revealed")).toBe(1);
    expect(count("practice_completed")).toBe(1);
    expect(count("quiz_answered")).toBe(2);
    expect(count("quiz_completed")).toBe(1);
  });

  it("a stale device cannot overwrite a stored quiz answer or shrink content", async () => {
    const res = await lib.syncSession("s1", sessionId, {
      units: [{
        category: "subject-verb-agreement",
        practice: [choice("p0-1")],
        quizResults: { "q1-2": { answer: "goes", score: 1, correct: true } },
      }],
    });
    const u = res!.session.units[0];
    expect(u.practice).toHaveLength(2);
    expect(u.quizResults["q1-2"].correct).toBe(false);
  });

  it("retake archives the old round, never overwrites it", async () => {
    const res = await lib.syncSession("s1", sessionId, {
      units: [{ category: "subject-verb-agreement", quizRound: 2, quiz: [choice("q2-1"), choice("q2-2")], quizResults: {}, previousQuizPrompts: ["She ___ home."] }],
    });
    expect(res!.session.units[0].quizRound).toBe(2);
    expect(res!.session.units[0].quizResults).toEqual({});
    const res2 = await lib.syncSession("s1", sessionId, {
      units: [{ category: "subject-verb-agreement", quizRound: 2, quizResults: { "q2-1": { answer: "goes", score: 1, correct: true }, "q2-2": { answer: "goes", score: 1, correct: true } } }],
    });
    expect(res2!.rounds.map((r) => [r.round, r.percent])).toEqual([[1, 50], [2, 100]]);
    expect(res2!.session.units[0].quizRound).toBe(2);
  });

  it("session completes once every unit has a finished quiz; completed event once", async () => {
    const res = await lib.syncSession("s1", sessionId, {
      current: "summary",
      units: [{ category: "tense", lessonSeen: true, quiz: [choice("t-1")], quizResults: { "t-1": { answer: "goes", score: 1, correct: true } } }],
      events: [{ type: "summary_viewed", key: "sv:1" }, { type: "summary_viewed", key: "sv:1" }],
    });
    expect(res!.session.status).toBe("completed");
    const feed = await lib.listEvents({ kind: "self", userId: "s1" }, { range: 0, page: 1, pageSize: 200 });
    expect(feed.rows.filter((r) => r.type === "session_completed")).toHaveLength(1);
    expect(feed.rows.filter((r) => r.type === "summary_viewed")).toHaveLength(1);
  });

  it("rejects open-answer questions inside a quiz", async () => {
    await expect(lib.syncSession("s1", sessionId, {
      units: [{ category: "tense", quizRound: 3, quiz: [{ id: "x", type: "compose", instruction: "i", criteria: "c", modelAnswer: "m", hint: "", explanation: "", explanationZh: "" } as never] }],
    })).rejects.toThrow(lib.LearnValidationError);
  });

  it("listing is lightweight and per-user; other users get 404", async () => {
    const list = await lib.listSessions("s1");
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("current");
    expect(list[0].units[0]).toMatchObject({ category: "subject-verb-agreement", quizPercent: 100 });
    expect(await lib.listSessions("s2")).toHaveLength(0);
    expect(await lib.getSession("s2", sessionId)).toBeNull();
    expect(await lib.syncSession("s2", sessionId, {})).toBeNull();
    expect(await lib.deleteSession("s2", sessionId)).toBe(false);
  });

  it("student dashboard: totals, topics, improvement, history", async () => {
    const d = await lib.getOwnDashboard("s1", { range: 30, timeZone: "Asia/Hong_Kong" });
    expect(d.totals).toMatchObject({ learners: 1, sessionsStarted: 1, sessionsCompleted: 1, quizzesCompleted: 3, practiceAnswered: 2 });
    expect(d.totals.practiceAccuracy).toBe(50);
    // Topics: SVA latest 100 (secure), tense 100 (secure)
    expect(d.totals.topicsSecure).toBe(2);
    // SVA went 50 → 100
    expect(d.totals.improvement).toBe(50);
    const sva = d.categories.find((c) => c.category === "subject-verb-agreement")!;
    expect(sva).toMatchObject({ quizzes: 2, avgLatest: 100, improvement: 50 });
    expect(d.quizHistory.map((p) => p.percent)).toEqual([50, 100, 100]);
    expect(d.series.length).toBeGreaterThan(0);
    expect(d.bucketUnit).toBe("day");
  });

  it("staff scope: teacher sees own class only; admin/all see everyone; filters narrow", async () => {
    const s2 = await lib.startSession("s2", { essayId: "e2", categories: ["tense"], age: 12 });
    if (!s2.ok) throw new Error("start");
    await lib.syncSession("s2", s2.session.id, { units: [{ category: "tense", lessonSeen: true, quiz: [choice("a-1")], quizResults: { "a-1": { answer: "go", score: 1, correct: true } } }] });

    const teacher1 = await lib.getStaffDashboard({ kind: "teacher", teacherId: "t1" }, { range: 0, timeZone: "UTC", page: 1, pageSize: 20 });
    expect(teacher1.totals.learners).toBe(1);
    expect(teacher1.students.map((s) => s.userId)).toEqual(["s1"]);
    expect(teacher1.users.map((u) => u.id)).toEqual(["s1"]);

    const teacher2 = await lib.getStaffDashboard({ kind: "teacher", teacherId: "t2" }, { range: 0, timeZone: "UTC", page: 1, pageSize: 20 });
    expect(teacher2.students.map((s) => s.userId)).toEqual(["s2"]);
    expect(teacher2.students[0]).toMatchObject({ avgQuizPercent: 0, quizzesCompleted: 1 });
    expect(teacher2.totals.topicsReview).toBe(1);

    const all = await lib.getStaffDashboard({ kind: "all" }, { range: 0, timeZone: "UTC", page: 1, pageSize: 20 });
    expect(all.totals.learners).toBe(2);
    const school = await lib.getStaffDashboard({ kind: "school", schoolId: "school-1" }, { range: 0, timeZone: "UTC", page: 1, pageSize: 20, classId: "c2" });
    expect(school.students.map((s) => s.userId)).toEqual(["s2"]);
    const byUser = await lib.getStaffDashboard({ kind: "all" }, { range: 0, timeZone: "UTC", page: 1, pageSize: 20, userId: "s1" });
    expect(byUser.totals.learners).toBe(1);
    expect(byUser.quizHistory.length).toBe(3);

    // A teacher cannot reach another class's session or events.
    expect(await lib.getStaffSession({ kind: "teacher", teacherId: "t1" }, s2.session.id)).toBeNull();
    expect((await lib.getStaffSession({ kind: "teacher", teacherId: "t2" }, s2.session.id))?.user.id).toBe("s2");
    expect((await lib.listStaffSessions({ kind: "teacher", teacherId: "t1" }, { page: 1, pageSize: 20 })).total).toBe(1);
    const ev = await lib.listEvents({ kind: "teacher", teacherId: "t1" }, { range: 0, page: 1, pageSize: 200 });
    expect(new Set(ev.rows.map((r) => r.userId))).toEqual(new Set(["s1"]));
    // Own-scope ignores a smuggled userId filter.
    const own = await lib.listEvents({ kind: "self", userId: "s2" }, { range: 0, page: 1, pageSize: 50, userId: "s1" });
    expect(new Set(own.rows.map((r) => r.userId))).toEqual(new Set(["s2"]));
  });

  it("deleting a session keeps the ledger; deleting the essay keeps the session", async () => {
    const before = await lib.getOwnDashboard("s1", { range: 0, timeZone: "UTC" });
    await db.query(`DELETE FROM language_check_essays WHERE id = 'e1'`);
    const kept = await lib.listSessions("s1");
    expect(kept[0].essayId).toBeNull();
    expect(kept[0].essayTitle).toBe("Essay");
    expect(await lib.deleteSession("s1", sessionId)).toBe(true);
    const after = await lib.getOwnDashboard("s1", { range: 0, timeZone: "UTC" });
    expect(after.totals.quizzesCompleted).toBe(before.totals.quizzesCompleted);
    expect(after.totals.sessionsStarted).toBe(before.totals.sessionsStarted);
    const rounds = await db.query(`SELECT COUNT(*)::int AS n FROM language_check_learn_rounds WHERE user_id='s1'`);
    expect((rounds.rows[0] as { n: number }).n).toBe(0);
    const feed = await lib.listEvents({ kind: "self", userId: "s1" }, { range: 0, page: 1, pageSize: 200 });
    expect(feed.rows.some((r) => r.type === "session_deleted")).toBe(true);
    expect(feed.rows.find((r) => r.type === "quiz_completed")?.sessionId).toBeNull();
  });

  it("persists progress that implies no ledger event (wrong first, correct on retry)", async () => {
    const started = await lib.startSession("s2", { essayId: "e2", categories: ["subject-verb-agreement"], age: 13 });
    if (!started.ok) throw new Error("start");
    const id = started.session.id;
    const cat = "subject-verb-agreement" as const;
    await lib.syncSession("s2", id, {
      units: [{
        category: cat,
        practice: [choice("p1"), choice("p2")],
        // item 1 answered wrong at first
        practiceResults: { p1: { score: 0, attempts: 1, completed: false } },
      }],
    });
    // the learner retries item 1 and gets it right while item 2 is still open:
    // no new answer, no completed practice -> no event, but it MUST be saved.
    const res = await lib.syncSession("s2", id, {
      units: [{ category: cat, practiceResults: { p1: { score: 0, attempts: 2, completed: true } } }],
    });
    expect(res!.session.units[0].practiceResults.p1).toMatchObject({ score: 0, attempts: 2, completed: true });
    const stored = (await lib.getSession("s2", id))!.session.units[0];
    expect(stored.practiceResults.p1.completed).toBe(true);
    expect(stored.practiceResults.p1.attempts).toBe(2);
    await lib.deleteSession("s2", id);
  });

  it("review view withholds unfinished practice/quiz from the response; the learning page's load keeps them", async () => {
    const started = await lib.startSession("s2", { essayId: "e2", categories: ["subject-verb-agreement"], age: 13 });
    if (!started.ok) throw new Error("start");
    const id = started.session.id;
    const cat = "subject-verb-agreement" as const;
    await lib.syncSession("s2", id, {
      units: [{
        category: cat,
        lesson, lessonSeen: true,
        practice: [{ ...choice("p1"), question: "SECRET PRACTICE" }, choice("p2")],
        practiceResults: { p1: { score: 1, attempts: 1, completed: true } },
        quiz: [{ ...choice("q1"), question: "SECRET QUIZ" }, choice("q2")],
        quizResults: { q1: { answer: "goes", score: 1, correct: true } },
      }],
    });
    const review = await lib.getSessionForReview("s2", id);
    const text = JSON.stringify(review);
    expect(text).not.toContain("SECRET PRACTICE");
    expect(text).not.toContain("SECRET QUIZ");
    expect(review!.session.units[0].hidden).toEqual({ practice: { completed: 1, total: 2 }, quiz: { answered: 1, total: 2 } });
    expect(review!.session.units[0].lesson?.title).toBe("T");
    // the redacted copy is a view only: the stored session is untouched
    const full = await lib.getSession("s2", id);
    expect(JSON.stringify(full)).toContain("SECRET PRACTICE");
    expect(full!.session.units[0].practiceResults.p1.completed).toBe(true);
    // finishing the practice reveals it, the quiz stays hidden
    await lib.syncSession("s2", id, { units: [{ category: cat, practiceResults: { p2: { score: 1, attempts: 1, completed: true } } }] });
    const later = JSON.stringify(await lib.getSessionForReview("s2", id));
    expect(later).toContain("SECRET PRACTICE");
    expect(later).not.toContain("SECRET QUIZ");
    // another user gets nothing
    expect(await lib.getSessionForReview("s1", id)).toBeNull();
    await lib.deleteSession("s2", id);
  });
});

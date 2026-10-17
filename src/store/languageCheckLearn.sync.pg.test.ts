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
let tail: Promise<void> = Promise.resolve();
vi.mock("@/lib/db", () => {
  const q = (sql: string, values?: unknown[]) => db.query(sql, values);
  return {
    getPool: () => ({ query: q }),
    getClient: async () => {
      let release!: () => void;
      const mine = new Promise<void>((r) => (release = r));
      const prev = tail; tail = prev.then(() => mine); await prev;
      return { query: q, release };
    },
  };
});
vi.mock("@/lib/users", () => ({ getSchoolForUser: async () => "s" }));

import * as lib from "@/lib/language-check-learn";
import type { LearnLesson } from "@/utils/languageCheckLearn";
import { patchBodySchema } from "@/lib/language-check-learn-schema";
import { useLanguageCheckLearnStore, sessionFromWire } from "@/store/languageCheckLearn";

// Route the store's fetch to the real server functions (through the real Zod schema).
let failNext = 0;
let calls = 0;
vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
  calls++;
  if (failNext > 0) { failNext--; throw new Error("offline"); }
  const id = url.split("/").pop()!;
  const json = (b: unknown, status = 200) => ({ ok: status < 400, status, json: async () => b });
  if (init?.method === "PATCH") {
    const parsed = patchBodySchema.safeParse(JSON.parse(init.body as string));
    if (!parsed.success) return json({ error: "bad" }, 400);
    const r = await lib.syncSession("u1", id, parsed.data);
    return r ? json(r) : json({ error: "nf" }, 404);
  }
  const d = await lib.getSession("u1", id);
  return d ? json(d) : json({ error: "nf" }, 404);
});

const text = "She go to school. He have a book.";
const corrections = [
  { id: "1", start: 4, end: 6, original: "go", correction: "goes", category: "subject-verb-agreement", explanation: "x", explanationZh: "x" },
  { id: "2", start: 22, end: 26, original: "have", correction: "has", category: "subject-verb-agreement", explanation: "x", explanationZh: "x" },
];
beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(`
    CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE ROLE reading_user;
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, school_id TEXT);
    CREATE TABLE classes (id TEXT PRIMARY KEY, teacher_id TEXT); CREATE TABLE class_members (class_id TEXT, student_id TEXT);
    CREATE TABLE language_check_essays (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), title TEXT DEFAULT '', status TEXT, checked_text TEXT DEFAULT '', corrections JSONB DEFAULT '[]');
    INSERT INTO users VALUES ('u1','U','u@x','s');`);
  await db.exec(fs.readFileSync("scripts/add-language-check-learn.sql", "utf8"));
  await db.query(`INSERT INTO language_check_essays VALUES ('e1','u1','Essay','checked',$1,$2::jsonb)`, [text, JSON.stringify(corrections)]);
});

const store = () => useLanguageCheckLearnStore.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const choice = (id: string) => ({ id, type: "choice" as const, question: "She ___ home.", options: ["go", "goes"], answer: "goes", hint: "", explanation: "", explanationZh: "" });
const lesson: LearnLesson = { title: "T", titleZh: "", summary: "S", summaryZh: "", whyItMatters: "", whyItMattersZh: "", rules: [{ heading: "h", headingZh: "", explanation: "e", explanationZh: "", pattern: "", examples: [] }], contrasts: [], chineseTransfer: null, tips: [] };

describe.skipIf(pgliteMissing)("client sync engine against the real server functions", () => {
  let id = "";
  it("debounces many local edits into few saves and persists content + answers", async () => {
    const started = await lib.startSession("u1", { essayId: "e1", categories: ["subject-verb-agreement"], age: 15 });
    if (!started.ok) throw new Error("start");
    id = started.session.id;
    store().start(sessionFromWire(started.session));
    const cat = "subject-verb-agreement";
    calls = 0;
    store().patchUnit(id, cat, () => ({ lesson: { status: "ready", data: lesson, error: null } }));
    store().markLessonSeen(id, cat);
    store().patchUnit(id, cat, () => ({ practice: { status: "ready", data: [choice("p1"), choice("p2")], error: null } }));
    store().recordPractice(id, cat, "p1", () => ({ score: 1, attempts: 1, completed: true }));
    store().recordPractice(id, cat, "p2", () => ({ score: 0, attempts: 3, completed: true, revealed: true }));
    store().setCurrent(id, { unit: 0, stage: "practice" });
    await sleep(1200);
    expect(calls).toBe(1);
    expect(store().sync).toBe("idle");
    const saved = (await lib.getSession("u1", id))!.session;
    expect(saved.units[0].lesson?.title).toBe("T");
    expect(saved.units[0].lessonSeen).toBe(true);
    expect(saved.units[0].practice).toHaveLength(2);
    expect(saved.units[0].practiceResults.p2).toMatchObject({ revealed: true, attempts: 3 });
    expect(saved.current).toEqual({ unit: 0, stage: "practice" });
  });

  it("an offline save is kept, retried, and arrives once", async () => {
    const cat = "subject-verb-agreement";
    store().patchUnit(id, cat, () => ({ quiz: { status: "ready", data: [choice("q1"), choice("q2")], error: null } }));
    failNext = 1;
    store().recordQuiz(id, cat, "q1", { answer: "goes", score: 1, correct: true });
    await sleep(100);
    expect(store().sync).toBe("error");
    // network back: flush now instead of waiting for the backoff timer
    expect(await store().flush()).toBe(true);
    expect(store().sync).toBe("idle");
    const saved = (await lib.getSession("u1", id))!.session;
    expect(saved.units[0].quiz).toHaveLength(2);
    expect(saved.units[0].quizResults.q1.correct).toBe(true);
  });

  it("finishing the quiz completes the session; round archived; retake flow keeps the old round", async () => {
    const cat = "subject-verb-agreement";
    store().recordQuiz(id, cat, "q2", { answer: "go", score: 1, correct: true }); // client lies; server re-grades
    expect(await store().flush()).toBe(true);
    expect(store().session!.status).toBe("completed");
    expect(store().session!.units[0].quizResults.q2).toMatchObject({ correct: false, score: 0 });
    const d1 = await lib.getSession("u1", id);
    expect(d1!.rounds.map((r) => [r.round, r.percent])).toEqual([[1, 50]]);

    // retake: new round locally, flushed, then answers
    store().patchUnit(id, cat, (u) => ({ quizResults: {}, quizRound: u.quizRound + 1, previousQuizPrompts: ["She ___ home."], quiz: { status: "loading", data: null, error: null } }));
    store().patchUnit(id, cat, () => ({ quiz: { status: "ready", data: [choice("q2a"), choice("q2b")], error: null } }));
    store().recordQuiz(id, cat, "q2a", { answer: "goes", score: 1, correct: true });
    store().recordQuiz(id, cat, "q2b", { answer: "goes", score: 1, correct: true });
    expect(await store().flush()).toBe(true);
    const d2 = await lib.getSession("u1", id);
    expect(d2!.rounds.map((r) => [r.round, r.percent])).toEqual([[1, 50], [2, 100]]);
    expect(store().session!.units[0].quizRound).toBe(2);
    expect(store().session!.units[0].quizResults.q2a.correct).toBe(true);
  });

  it("a second device sees everything, adds progress; first device converges via pull", async () => {
    const cat = "subject-verb-agreement";
    // "device B" opens the saved session from the database
    const b = (await lib.getSession("u1", id))!.session;
    expect(sessionFromWire(b).units[0].quiz.data).toHaveLength(2);
    expect(sessionFromWire(b).units[0].lesson.status).toBe("ready");
    // device B generates extra practice and answers it
    await lib.syncSession("u1", id, { units: [{ category: cat, practice: [choice("p1"), choice("p2"), choice("p3")], practiceResults: { p3: { score: 1, attempts: 1, completed: true } } }] });
    // device A (this store) pulls
    await store().pull(id);
    const u = store().session!.units[0];
    expect(u.practice.data).toHaveLength(3);
    expect(u.practiceResults.p3.completed).toBe(true);
  });

  it("a 400 from the server does not retry forever", async () => {
    const cat = "subject-verb-agreement";
    store().patchUnit(id, cat, () => ({ practice: { status: "ready", data: [{ ...choice("p1"), options: ["only-one"] }], error: null } }));
    calls = 0;
    await sleep(1000);
    expect(store().sync).toBe("error");
    const after = calls;
    await sleep(500);
    expect(calls).toBe(after);
  });

  it("a session deleted elsewhere stops saving (404) instead of looping", async () => {
    await lib.deleteSession("u1", id);
    store().setCurrent(id, { unit: 0, stage: "lesson" });
    await sleep(1000);
    expect(store().sync).toBe("error");
    calls = 0;
    await sleep(500);
    expect(calls).toBe(0);
  });
});

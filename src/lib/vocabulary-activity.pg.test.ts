// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "fs";

// Real-Postgres tests of the vocabulary analytics SQL. They need the in-process
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

import * as lib from "@/lib/vocabulary-activity";

const DAY = 86_400_000;
const now = Date.now();

beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(`
    CREATE ROLE reading_user;
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, school_id TEXT, banned BOOLEAN DEFAULT FALSE);
    CREATE TABLE user_roles (user_id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'student');
    CREATE TABLE classes (id TEXT PRIMARY KEY, name TEXT, teacher_id TEXT);
    CREATE TABLE class_members (class_id TEXT, student_id TEXT);
    CREATE TABLE user_vocabulary (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, word TEXT NOT NULL,
      syllabification TEXT DEFAULT '', part_of_speech TEXT DEFAULT '',
      english_definition TEXT DEFAULT '', chinese_definition TEXT DEFAULT '', example TEXT DEFAULT '',
      rating TEXT, mastery_level INTEGER NOT NULL DEFAULT 0, review_count INTEGER NOT NULL DEFAULT 0,
      next_review_at BIGINT NOT NULL DEFAULT 0, entry_type TEXT NOT NULL DEFAULT 'word',
      hidden_at BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL DEFAULT 0,
      updated_at BIGINT NOT NULL DEFAULT 0, shared_by TEXT
    );
    CREATE TABLE vocabulary_review_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mode TEXT NOT NULL, total_words INTEGER, correct_count INTEGER,
      accuracy INTEGER, entry_type TEXT NOT NULL DEFAULT 'word', started_at BIGINT, completed_at BIGINT
    );
    CREATE TABLE vocabulary_review_results (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, word TEXT, correct BOOLEAN,
      mastery_after INTEGER DEFAULT 0, rating TEXT, attempts INTEGER DEFAULT 1
    );
  `);
  // the real migration (also proves it runs, backfill included, on existing data)
  const seed = `
    INSERT INTO users VALUES ('t1','Teacher','t@x','s1'),('t2','Other teacher','t2@x','s1'),
      ('a','Ann','a@x','s1'),('b','Bob','b@x','s1'),('c','Cy','c@x','s2'),('ban','Banned','ban@x','s1');
    UPDATE users SET banned = TRUE WHERE id = 'ban';
    INSERT INTO user_roles VALUES ('t1','teacher'),('t2','teacher'),('a','student'),('b','student');
    INSERT INTO classes VALUES ('k1','K1','t1'),('k2','K2','t2');
    INSERT INTO class_members VALUES ('k1','a'),('k1','ban'),('k2','b');
    INSERT INTO user_vocabulary (user_id, word, mastery_level, review_count, next_review_at, entry_type, rating, created_at) VALUES
      ('a','apple',5,3,${now + DAY},'word',NULL,${now - 5 * DAY}),
      ('a','take off',0,0,0,'phrase','hard',${now - 5 * DAY}),
      ('a','gone',2,1,${now - 1000},'word',NULL,${now - 2 * DAY}),
      ('b','pear',1,1,${now - 1000},'word','hard',${now - 5 * DAY}),
      ('ban','x',1,1,0,'word',NULL,${now});
    UPDATE user_vocabulary SET hidden_at = 1 WHERE word = 'gone';
    -- Definitions behind the analytics counts (Ann's apple is rich, Bob's is bare
    -- so the richness ordering is testable; Bob's pear is the only filled pear).
    UPDATE user_vocabulary SET syllabification = 'ap-ple', part_of_speech = 'noun',
      english_definition = 'a round fruit', chinese_definition = '蘋果',
      example = 'An apple a day.', updated_at = ${now - 2 * DAY}
      WHERE user_id = 'a' AND word = 'apple';
    UPDATE user_vocabulary SET syllabification = 'pear', part_of_speech = 'noun',
      english_definition = 'a sweet fruit', chinese_definition = '梨',
      example = 'She ate a pear.', updated_at = ${now - DAY}
      WHERE user_id = 'b' AND word = 'pear';
    INSERT INTO user_vocabulary (user_id, word, entry_type, created_at, updated_at) VALUES
      ('b', 'apple', 'word', ${now - DAY}, ${now});
    INSERT INTO vocabulary_review_sessions VALUES
      ('s1','a','flashcard',4,3,75,'word',0,${now - 3 * DAY}),
      ('s2','a','spelling',4,4,100,'word',0,${now - 1 * DAY}),
      ('s3','b','quiz',5,1,20,'word',0,${now - 2 * DAY}),
      ('s4','b','quiz',5,1,20,'word',0,${now - 200 * DAY}),
      ('s5','ban','quiz',5,5,100,'word',0,${now});
    INSERT INTO vocabulary_review_results (session_id, word, correct) VALUES
      ('s1','apple',TRUE),('s1','pear',FALSE),('s1','gone',FALSE),('s3','pear',FALSE),('s3','apple',FALSE),('s4','pear',FALSE);
  `;
  await db.exec(
    fs.readFileSync("scripts/add-vocabulary-activity.sql", "utf8").replace(/GRANT[^;]*;/g, "").replace(
      /-- Backfill: every existing[\s\S]*$/,
      "",
    ),
  );
  await db.exec(seed);
  // run the backfill part against the seeded data
  const mig = fs.readFileSync("scripts/add-vocabulary-activity.sql", "utf8");
  await db.exec(mig.slice(mig.indexOf("-- Backfill: every existing")));
});

const base = { range: 30, timeZone: "UTC", page: 1, pageSize: 20 };
const t1 = { kind: "teacher", teacherId: "t1" } as const;

describe.skipIf(pgliteMissing)("vocabulary analytics SQL", () => {
  it("backfill: sessions + non-shared words become ledger events, idempotently", async () => {
    const r = await db.query(`SELECT type, COUNT(*)::int AS n FROM vocabulary_activity_events GROUP BY type ORDER BY type`);
    expect(r.rows).toEqual([
      { type: "session_completed", n: 5 },
      { type: "words_added", n: expect.any(Number) },
    ]);
  });

  it("logVocabularyActivity is idempotent per event key", async () => {
    await lib.logVocabularyActivity({ userId: "a", type: "session_completed", eventKey: "k-1", details: { total: 1 } });
    await lib.logVocabularyActivity({ userId: "a", type: "session_completed", eventKey: "k-1", details: { total: 1 } });
    const r = await db.query(`SELECT COUNT(*)::int AS n FROM vocabulary_activity_events WHERE event_key = 'k-1'`);
    expect(r.rows[0]).toEqual({ n: 1 });
  });

  it("teacher scope: only own students, no banned/staff, window applied", async () => {
    const d = await lib.getVocabularyAnalytics(t1, base);
    expect(d.users.map((u) => u.id)).toEqual(["a"]); // Bob is t2's, Banned excluded
    expect(d.students).toHaveLength(1);
    expect(d.studentsTotal).toBe(1);
    expect(d.totals.sessions).toBe(2);
    expect(d.totals.wordsReviewed).toBe(8);
    expect(d.totals.accuracy).toBe(88); // 7/8
    // hidden word excluded from the bank snapshot
    expect(d.snapshot.words + d.snapshot.phrases).toBe(2);
    expect(d.snapshot.mastered).toBe(1);
    expect(d.snapshot.levels).toEqual([1, 0, 0, 0, 0, 1]);
    const s = d.students[0];
    expect(s.sessions).toBe(2);
    expect(s.trend).toBe(25); // 100 - 75
    expect(d.modes.find((m) => m.mode === "flashcard")?.sessions).toBe(1);
    expect(d.sessionHistory).toEqual([]); // not a single-learner view
  });

  it("school scope sees everyone in the school, all-time includes old sessions", async () => {
    const d = await lib.getVocabularyAnalytics({ kind: "school", schoolId: "s1" }, { ...base, range: 0 });
    expect(d.users.map((u) => u.id).sort()).toEqual(["a", "b"]);
    expect(d.totals.sessions).toBe(4); // s1..s4, not the banned user's
    const hard = d.hardWords[0];
    expect(hard.word).toBe("pear");
    expect(hard.wrong).toBe(3);
    expect(hard.learners).toBe(2);
  });

  it("hard words resolve definitions from in-scope banks; hidden or out-of-scope words stay null", async () => {
    // School scope: both banks visible.
    const school = await lib.getVocabularyAnalytics({ kind: "school", schoolId: "s1" }, { ...base, range: 0 });
    const pear = school.hardWords.find((w) => w.word === "pear");
    expect(pear?.entryType).toBe("word");
    expect(pear?.englishDefinition).toBe("a sweet fruit");
    expect(pear?.chineseDefinition).toBe("梨");
    expect(pear?.example).toBe("She ate a pear.");
    // Richest in-scope row wins: Ann's filled 'apple' beats Bob's bare one.
    expect(school.hardWords.find((w) => w.word === "apple")?.englishDefinition).toBe("a round fruit");
    // 'gone' is hidden since review — unresolvable even though Ann reviewed it.
    const gone = school.hardWords.find((w) => w.word === "gone");
    expect(gone?.entryType).toBeNull();
    expect(gone?.englishDefinition).toBeNull();
    // Teacher t1 cannot see Bob's bank, so 'pear' resolves to nothing there.
    const t1v = await lib.getVocabularyAnalytics(t1, { ...base, range: 0 });
    expect(t1v.hardWords.find((w) => w.word === "pear")?.entryType).toBeNull();
    // Self view resolves from the learner's own bank only (Bob's 'apple' is bare).
    const selfB = await lib.getSelfVocabularyAnalytics("b", { range: 0, timeZone: "UTC" });
    expect(selfB.hardWords.find((w) => w.word === "pear")?.englishDefinition).toBe("a sweet fruit");
    const selfApple = selfB.hardWords.find((w) => w.word === "apple");
    expect(selfApple?.entryType).toBe("word");
    expect(selfApple?.englishDefinition).toBe("");
  });

  it("single learner view returns progress history; class filter narrows", async () => {
    const one = await lib.getVocabularyAnalytics({ kind: "all" }, { ...base, userId: "a" });
    expect(one.sessionHistory.map((p) => p.accuracy)).toEqual([75, 100]);
    const cls = await lib.getVocabularyAnalytics({ kind: "all" }, { ...base, classId: "k2" });
    expect(cls.students.map((s) => s.userId)).toEqual(["b"]);
    // a student outside the teacher's scope is not reachable by filter
    const out = await lib.getVocabularyAnalytics(t1, { ...base, userId: "b" });
    expect(out.students).toEqual([]);
    expect(out.totals.sessions).toBe(0);
  });

  it("mineTeacherId (My Classes) narrows every query and intersects the scope", async () => {
    // Super-admin + "My Classes" (t1 owns k1): only Ann, exactly like classId=k1.
    const mine = await lib.getVocabularyAnalytics({ kind: "all" }, { ...base, mineTeacherId: "t1" });
    expect(mine.students.map((s) => s.userId)).toEqual(["a"]);
    expect(mine.totals.sessions).toBe(2); // s1 + s2, not b's s3/s4
    expect(mine.users.map((u) => u.id)).toEqual(["a"]);
    // The teacher's own scope ∩ another teacher's classes = nothing leaks.
    const none = await lib.getVocabularyAnalytics(t1, { ...base, mineTeacherId: "t2" });
    expect(none.students).toEqual([]);
    expect(none.totals.sessions).toBe(0);
    const sess = await lib.listStaffReviewSessions(
      { kind: "all" },
      { range: 0, page: 1, pageSize: 20, mineTeacherId: "t1" },
    );
    expect(sess.rows.map((r) => r.userId)).toEqual(["a", "a"]);
    const act = await lib.listVocabularyActivity(
      { kind: "all" },
      { range: 0, page: 1, pageSize: 50, mineTeacherId: "t1" },
    );
    expect(act.rows.every((r) => r.userId === "a")).toBe(true);
    const stu = await lib.listAnalyticsStudents({ kind: "all" }, { mineTeacherId: "t1" });
    expect(stu.map((s) => s.id)).toEqual(["a"]);
  });

  it("self analytics: the learner's own data only, no per-student/user lists", async () => {
    const d = await lib.getSelfVocabularyAnalytics("a", { range: 30, timeZone: "UTC" });
    expect(d.students).toEqual([]);
    expect(d.studentsTotal).toBe(0);
    expect(d.users).toEqual([]);
    expect(d.totals.sessions).toBe(2);
    expect(d.totals.accuracy).toBe(88); // 7/8, same as the staff view of "a"
    expect(d.sessionHistory.map((p) => p.accuracy)).toEqual([75, 100]);
    // another learner's rows never leak into a self view
    const b = await lib.getSelfVocabularyAnalytics("b", { range: 0, timeZone: "UTC" });
    expect(b.totals.sessions).toBe(2); // s3 + the 200-day-old s4 (range 0 = all time)
    expect(b.hardWords.length).toBeGreaterThan(0);
    expect(b.hardWords.every((w) => w.learners === 1)).toBe(true);
  });

  it("sessions + activity lists are scoped, paged and newest-first", async () => {
    const s = await lib.listStaffReviewSessions(t1, { range: 0, page: 1, pageSize: 1 });
    expect(s.total).toBe(2);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].id).toBe("s2");
    const m = await lib.listStaffReviewSessions({ kind: "all" }, { range: 0, page: 1, pageSize: 20, mode: "quiz" });
    expect(m.rows.every((r) => r.mode === "quiz")).toBe(true);
    expect(m.rows.some((r) => r.userId === "ban")).toBe(false);
    const act = await lib.listVocabularyActivity(t1, { range: 0, page: 1, pageSize: 50 });
    expect(act.rows.every((r) => r.userId === "a")).toBe(true);
    expect(act.rows[0].createdAt).toBeGreaterThanOrEqual(act.rows[act.rows.length - 1].createdAt);
  });
});

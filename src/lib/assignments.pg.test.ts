// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// Real-Postgres tests of the assignment working-copy pipeline. They need the
// in-process engine, which is deliberately NOT a project dependency:
// `npm i --no-save @electric-sql/pglite` to run them; otherwise they are skipped.
//
// Covers the three layers of the roster-progress fix:
//   1. insertStudentAssignmentSession now persists the teacher-prepared
//      content (pre_reading, collocations, vocabulary_quiz,
//      generated_text_meta) so calculateProgress sees the same content steps
//      as the teacher's source session — the roster baseline matches the
//      sidebar / Learning Journey / Avg progress views instead of silently
//      dropping one step (40% -> 33%).
//   2. The per-item teacher answers never ship (grammarQuiz / vocabularyQuiz
//      are stripped by stripSessionForAssignment).
//   3. scripts/backfill-assignment-session-content.sql repairs copies created
//      before (1), and syncAssignmentProgressCache (via getAssignment)
//      re-converges the cached assignment_submissions.progress.
type Db = {
  query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }>;
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
  getClient: async () => ({
    query: (sql: string, values?: unknown[]) => db.query(sql, values),
    release: () => {},
  }),
}));

import { createAssignment, getAssignment, syncSubmissionMetrics } from "@/lib/assignments";
import type { ReadingStore } from "@/store/reading";

const TEACHER = "teacher-1";
const STUDENT = "student-1";

/** Source session with 6 completed CONTENT steps: extracted text, summary,
 *  mind map, adapted text, glossary and collocations (pre-reading content
 *  ships too, but the prediction is reset per student). 6/15 = 40%. */
function sourceSession(): ReadingStore {
  return {
    id: "src",
    docTitle: "Fix test",
    extractedText: "Once upon a time…",
    summary: "A summary",
    mindMap: "mind map json",
    adaptedText: "An adapted text",
    glossary: [{ word: "once" } as GlossaryEntry],
    collocations: [{ id: "c1", chunk: "once upon" } as CollocationChunk],
    preReading: { activationPrompts: ["a"], predictionPrompt: "p" } as unknown as PreReadingData,
    studentPrediction: "teacher's own prediction",
    generatedTextMeta: { model: "m" } as unknown as GeneratedTextMeta,
    grammarQuiz: [
      { id: "g1", question: "Q", correctAnswer: "a", userAnswer: "a", points: 1, earnedPoints: 1 },
    ],
    vocabularyQuiz: [
      { id: "v1", question: "Q", options: ["a", "b"], correctAnswer: "a", userAnswer: "a", wordRef: "once" },
    ],
  } as unknown as ReadingStore;
}

/** Column list mirrors insertStudentAssignmentSession / the queries under test. */
const SCHEMA = `
  CREATE TABLE reading_sessions (
    id TEXT PRIMARY KEY, user_id TEXT, doc_title TEXT, source TEXT, student_age INT,
    extracted_text TEXT, generated_text_meta JSONB, summary TEXT, adapted_text TEXT,
    simplified_text TEXT, highlighted_words JSONB, analyzed_sentences JSONB, mind_map TEXT,
    visualization_image TEXT, visualization_generated_at BIGINT, reading_test JSONB,
    glossary JSONB, glossary_ratings JSONB, test_score INT, test_completed BOOLEAN,
    test_earned_points INT, test_total_points INT, test_show_chinese BOOLEAN, test_mode TEXT,
    vocabulary_quiz_score INT, spelling_game_best_score INT, spelling_game_accuracy INT,
    chat_history JSONB, tests_completed INT, vocab_quizzes_completed INT,
    spelling_games_completed INT, original_difficulty JSONB, adapted_difficulty JSONB,
    simplified_difficulty JSONB, include_glossary BOOLEAN, include_sentence_analysis BOOLEAN,
    grammar_topics JSONB, grammar_quiz JSONB, grammar_quiz_score INT, grammar_quiz_completed BOOLEAN,
    grammar_quizzes_completed INT, grammar_quiz_earned_points INT, grammar_quiz_total_points INT,
    grammar_generated_at BIGINT, grammar_quiz_completed_at BIGINT, grammar_highlight_enabled BOOLEAN,
    grammar_highlight_topic_id TEXT, grammar_quiz_mode TEXT,
    grammar_scramble_high_score INT, grammar_workshop_high_score INT,
    grammar_surgery_high_score INT, grammar_roulette_high_score INT, grammar_duel_high_score INT,
    grammar_game_accuracy INT, grammar_games_completed INT, grammar_game_completed_at TIMESTAMPTZ,
    grammar_scramble_accuracy INT, grammar_workshop_accuracy INT, grammar_surgery_accuracy INT,
    grammar_roulette_accuracy INT, grammar_duel_accuracy INT,
    grammar_scramble_completed INT, grammar_workshop_completed INT, grammar_surgery_completed INT,
    grammar_roulette_completed INT, grammar_duel_completed INT,
    grammar_error_challenges JSONB, grammar_scramble_challenges JSONB,
    grammar_workshop_challenges JSONB, grammar_game_questions JSONB,
    vocabulary_quiz JSONB, pre_reading JSONB, pre_reading_generated_at BIGINT,
    collocations JSONB, collocations_generated_at BIGINT,
    student_prediction TEXT, prediction_rating INT,
    assignment_id TEXT, created_at TIMESTAMPTZ, visualization_language TEXT,
    mind_map_language TEXT, summary_language TEXT
  );
  CREATE TABLE assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '',
    subject TEXT DEFAULT '', source_session_id TEXT, source_session_snapshot JSONB,
    source_doc_title TEXT DEFAULT '', due_date TIMESTAMPTZ, applied_preset_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE assignment_submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id TEXT NOT NULL, student_id TEXT NOT NULL, student_session_id TEXT,
    progress INT, test_score INT, test_completed BOOLEAN, vocabulary_quiz_score INT,
    spelling_game_best_score INT, grammar_quiz_score INT, grammar_game_best_score INT,
    grammar_game_accuracy INT, spelling_game_accuracy INT,
    last_viewed_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

beforeAll(async () => {
  if (pgliteMissing) return;
  await db.exec(SCHEMA);
});

async function submissionRow(assignmentId: string) {
  const { rows } = await db.query(
    `SELECT s.*, r.pre_reading, r.collocations, r.vocabulary_quiz, r.grammar_quiz,
            r.generated_text_meta
     FROM assignment_submissions s
     JOIN reading_sessions r ON r.id = s.student_session_id
     WHERE s.assignment_id = $1`,
    [assignmentId],
  );
  return rows[0];
}

describe.skipIf(pgliteMissing)("assignment working copies", () => {
  it("ships the teacher's pre-reading/collocations content and the correct progress baseline", async () => {
    const assignment = await createAssignment({
      teacherId: TEACHER,
      title: "T",
      sourceSessionData: sourceSession(),
      studentIds: [STUDENT],
    });

    // createAssignment seeds progress fire-and-forget; make it deterministic.
    const { rows } = await db.query(
      `SELECT student_session_id FROM assignment_submissions WHERE assignment_id = $1`,
      [assignment.id],
    );
    await syncSubmissionMetrics(rows[0].student_session_id);

    const row = await submissionRow(assignment.id);
    // Content the old INSERT dropped is present in the copy…
    expect(row.pre_reading).toMatchObject({ activationPrompts: ["a"] });
    expect(row.collocations).toEqual([{ id: "c1", chunk: "once upon" }]);
    expect(row.vocabulary_quiz.length).toBe(1);
    expect(row.generated_text_meta).toEqual({ model: "m" });
    // …without the teacher's per-item answers or prediction…
    expect(row.vocabulary_quiz[0].userAnswer).toBeUndefined();
    expect(row.grammar_quiz[0].userAnswer).toBeUndefined();
    expect(row.grammar_quiz[0].earnedPoints).toBeUndefined();
    // …so the baseline counts every content step: 6/15 = 40% (was 4/15 = 27%).
    expect(row.progress).toBe(40);
  });

  it("re-converges stale cached progress and Avg progress on read (getAssignment)", async () => {
    const assignment = await createAssignment({
      teacherId: TEACHER,
      title: "T2",
      sourceSessionData: sourceSession(),
      studentIds: [STUDENT],
    });
    await db.query(
      `UPDATE assignment_submissions SET progress = 27 WHERE assignment_id = $1`,
      [assignment.id],
    );

    const healed = await getAssignment(assignment.id, TEACHER, "teacher");
    expect(healed?.avgProgress).toBe(40);

    const row = await submissionRow(assignment.id);
    expect(row.progress).toBe(40);
  });

  it("backfills content into copies created before the fix (migration)", async () => {
    // Old-style copy: the columns were never written, grammar_quiz still
    // carries the teacher's per-item answers, snapshot unsanitized.
    const snapshot = {
      preReading: { activationPrompts: ["b"] },
      preReadingGeneratedAt: 123,
      collocations: [{ id: "c2", chunk: "look after" }],
      collocationsGeneratedAt: 456,
      vocabularyQuiz: [
        { id: "v2", question: "Q", options: ["a"], correctAnswer: "a", userAnswer: "a", wordRef: "x" },
      ],
      generatedTextMeta: { model: "m2" },
      grammarQuiz: [
        { id: "g2", question: "Q", correctAnswer: "a", userAnswer: "a", points: 1, earnedPoints: 1 },
      ],
    };
    const { rows: created } = await db.query(
      `INSERT INTO assignments (teacher_id, title, source_session_snapshot)
       VALUES ($1, 'old', $2) RETURNING id`,
      [TEACHER, JSON.stringify(snapshot)],
    );
    const assignmentId = created[0].id;
    await db.query(
      `INSERT INTO reading_sessions (id, user_id, doc_title, source, extracted_text, summary,
         adapted_text, glossary, grammar_quiz, assignment_id)
       VALUES ('old-copy', $1, 'd', 'assignment', 'text', 's', 'a', '[]', $2, $3)`,
      [STUDENT, JSON.stringify(snapshot.grammarQuiz), assignmentId],
    );
    await db.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, student_session_id, progress)
       VALUES ($1, $2, 'old-copy', 20)`,
      [assignmentId, STUDENT],
    );

    const migration = fs.readFileSync(
      path.join(process.cwd(), "scripts/backfill-assignment-session-content.sql"),
      "utf8",
    );
    await db.exec(migration);

    const row = await submissionRow(assignmentId);
    expect(row.pre_reading).toEqual({ activationPrompts: ["b"] });
    expect(row.collocations).toEqual([{ id: "c2", chunk: "look after" }]);
    expect(row.vocabulary_quiz[0].userAnswer).toBeUndefined();
    expect(row.grammar_quiz[0].userAnswer).toBeUndefined();
    expect(row.grammar_quiz[0].earnedPoints).toBeUndefined();
    expect(row.generated_text_meta).toEqual({ model: "m2" });

    // The frozen snapshot is sanitized too (used when the roster is extended).
    const { rows: aRows } = await db.query(
      `SELECT source_session_snapshot->'vocabularyQuiz' AS vq,
              source_session_snapshot->'grammarQuiz' AS gq
       FROM assignments WHERE id = $1`,
      [assignmentId],
    );
    expect(aRows[0].vq[0].userAnswer).toBeUndefined();
    expect(aRows[0].gq[0].userAnswer).toBeUndefined();

    // Reading the assignment heals the stale progress: text+summary+adapted
    // (3) + pre-reading content… prediction is the student's, so still off…
    // + collocations = 4/15 = 27%.
    const healed = await getAssignment(assignmentId, TEACHER, "teacher");
    expect(healed?.avgProgress).toBe(27);
  });
});

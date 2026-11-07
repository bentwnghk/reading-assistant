import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Teacher-uploaded essays: POST /api/writing-assessment with a studentId must
// create the row owned by the STUDENT (so it lists/opens/feeds Learn for
// them exactly as a self-upload) with uploaded_by = the staff caller, and
// refuse non-staff or out-of-scope callers without inserting anything.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";
/** canUploadForStudent result: how many rows the scope check finds. */
let scopeRows = 1;
/** essayHasAssessment result: 1 = the essay already carries an assessment. */
let assessedRows = 0;

vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "teacher-1", role } } : null),
}));

vi.mock("@/lib/users", () => ({
  getSchoolForUser: async () => "school-1",
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      const flat = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: flat, values: values ?? [] });
      if (flat.includes("FROM language_check_topics"))
        return {
          rows: [
            {
              id: "topic-1",
              title: "S6 Writing 1",
              topic: "Write a letter",
              essay_type: "dse-part-a",
              question_image: "",
              has_image: false,
            },
          ],
        };
      if (flat.includes("SELECT 1 FROM users u")) return { rows: [], rowCount: scopeRows };
      if (flat.startsWith("SELECT 1 FROM language_check_essays"))
        return { rows: [], rowCount: assessedRows };
      if (flat.startsWith("WITH ins")) {
        return {
          rows: [
            {
              id: "essay-1",
              user_id: values?.[0],
              uploaded_by: values?.[1] ?? null,
              title: "",
              images: [],
              transcript: "",
              status: "draft",
              checked_text: "",
              corrections: [],
              ocr_model: "",
              check_model: "",
              dropped_count: 0,
              created_at: "2026-01-01",
              updated_at: "2026-01-01",
              owner_id: values?.[0],
              owner_name: "Alice",
            },
          ],
        };
      }
      if (flat.includes("COUNT(*)::int AS n")) return { rows: [{ n: 0 }] };
      if (flat.startsWith("UPDATE language_check_essays SET title"))
        return { rows: [], rowCount: 1 };
      if (flat.startsWith("UPDATE language_check_essays SET assessment"))
        return { rows: [], rowCount: 1 };
      if (flat.startsWith("UPDATE language_check_essays SET enhanced"))
        return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  }),
}));

import { POST } from "./route";
import { PATCH } from "./[id]/route";

const IMAGE = "data:image/jpeg;base64,AAAA";

function post(body: unknown) {
  return {
    method: "POST",
    json: async () => body,
  } as unknown as Request;
}

function patch(body: unknown) {
  return {
    method: "PATCH",
    json: async () => body,
    nextUrl: new URL("http://localhost/api/writing-assessment/essay-1"),
  } as unknown as NextRequest;
}

const insertQuery = () => queries.find((q) => q.sql.startsWith("WITH ins"))!;
const scopeQuery = () => queries.find((q) => q.sql.includes("SELECT 1 FROM users u"));

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
  scopeRows = 1;
  assessedRows = 0;
});

describe("POST /api/writing-assessment (teacher upload)", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect(
      (await POST(post({ images: [IMAGE], topicId: "topic-1", studentId: "s1" }))).status,
    ).toBe(401);
  });

  it("refuses studentId from a student without touching the database", async () => {
    role = "student";
    const res = await POST(post({ images: [IMAGE], topicId: "topic-1", studentId: "s1" }));
    expect(res.status).toBe(403);
    expect(queries).toHaveLength(0);
  });

  it("refuses a student outside the staff scope", async () => {
    scopeRows = 0;
    const res = await POST(post({ images: [IMAGE], topicId: "topic-1", studentId: "s1" }));
    expect(res.status).toBe(403);
    expect(insertQuery()).toBeUndefined();
    // Teacher scope: membership in the caller's classes, students only
    // (roles live in user_roles — no row = implicit student).
    expect(scopeQuery()!.sql).toContain("LEFT JOIN user_roles ur");
    expect(scopeQuery()!.sql).toContain("COALESCE(ur.role, 'student') = 'student'");
    expect(scopeQuery()!.sql).toContain("uc.teacher_id = $1");
    expect(scopeQuery()!.values[1]).toBe("s1");
  });

  it("creates the essay owned by the student, uploaded_by the teacher", async () => {
    const res = await POST(post({ images: [IMAGE], topicId: "topic-1", studentId: "s1" }));
    expect(res.status).toBe(201);
    const essay = (await res.json()) as LanguageCheckEssay;
    expect(essay.ownerId).toBe("s1");
    expect(essay.ownerName).toBe("Alice");
    const insert = insertQuery();
    expect(insert.values[0]).toBe("s1"); // user_id = student
    expect(insert.values[1]).toBe("teacher-1"); // uploaded_by = staff caller
    // The essay cap counts against the owner, not the uploader.
    const count = queries.find((q) => q.sql.includes("COUNT(*)::int AS n"))!;
    expect(count.values[0]).toBe("s1");
  });

  it("snapshots the library topic onto the essay and uses its title", async () => {
    await POST(post({ images: [IMAGE], topicId: "topic-1" }));
    const insert = insertQuery();
    expect(insert.values.slice(2, 3)).toEqual(["S6 Writing 1"]);
    expect(insert.values.slice(5)).toEqual([
      "topic-1",
      "Write a letter",
      "dse-part-a",
      "",
    ]);
  });

  it("rejects an upload without a topic", async () => {
    const res = await POST(post({ images: [IMAGE] }));
    expect(res.status).toBe(400);
    expect(insertQuery()).toBeUndefined();
  });

  it("without studentId keeps the legacy self-owned insert", async () => {
    const res = await POST(post({ images: [IMAGE], topicId: "topic-1" }));
    expect(res.status).toBe(201);
    const insert = insertQuery();
    expect(insert.values[0]).toBe("teacher-1");
    expect(insert.values[1]).toBeNull();
  });
});

describe("PATCH /api/writing-assessment/[id] (uploader access)", () => {
  it("lets the uploader patch via the user_id OR uploaded_by predicate", async () => {
    const res = await PATCH(patch({ title: "Renamed" }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    const update = queries.find((q) =>
      q.sql.startsWith("UPDATE language_check_essays SET title"),
    )!;
    expect(update.sql).toContain("OR uploaded_by = $");
  });
});

// Students cannot re-assess an assessed essay: the first saved assessment is
// final for them, while staff may always replace one. A null assessment (the
// reset a fresh check writes) must keep flowing for everyone.
describe("PATCH /api/writing-assessment/[id] (student re-assessment lock)", () => {
  const ASSESSMENT: LanguageCheckAssessment = {
    overall: 5,
    scores: {
      grammar: 5,
      sentenceStructure: 4,
      vocabulary: 5,
      spellingPunctuation: 6,
      registerToneStyle: 4,
    },
    strengths: [{ en: "Clear topic sentence", zh: "主題句清晰" }],
    weaknesses: [{ en: "Tense errors", zh: "時態錯誤" }],
    assessedAt: 1700000000000,
    model: "gpt-6.1-sol",
  };

  const assessmentPatch = () =>
    queries.find((q) =>
      q.sql.startsWith("UPDATE language_check_essays SET assessment"),
    );

  it("rejects a student saving a new assessment over the saved one", async () => {
    role = "student";
    assessedRows = 1;
    const res = await PATCH(patch({ assessment: ASSESSMENT }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(403);
    expect(assessmentPatch()).toBeUndefined();
    // The lock is checked against the essay the caller owns/uploaded.
    const guard = queries.find((q) =>
      q.sql.startsWith("SELECT 1 FROM language_check_essays"),
    )!;
    expect(guard.sql).toContain("assessment IS NOT NULL");
    expect(guard.sql).toContain("OR uploaded_by = $");
    expect(guard.values[0]).toBe("essay-1");
  });

  it("lets a student save the FIRST assessment", async () => {
    role = "student";
    assessedRows = 0;
    const res = await PATCH(patch({ assessment: ASSESSMENT }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(assessmentPatch()).toBeDefined();
  });

  it("lets staff replace a saved assessment", async () => {
    role = "teacher";
    assessedRows = 1;
    const res = await PATCH(patch({ assessment: ASSESSMENT }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(assessmentPatch()).toBeDefined();
    // No lock lookup for staff callers at all.
    expect(
      queries.find((q) =>
        q.sql.startsWith("SELECT 1 FROM language_check_essays"),
      ),
    ).toBeUndefined();
  });

  it("still lets a student PATCH the null reset a fresh check writes", async () => {
    role = "student";
    assessedRows = 1;
    const res = await PATCH(patch({ assessment: null }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(assessmentPatch()).toBeDefined();
  });
});

// Same lock for enhanced essays: the first saved generation is final for
// students; only staff may regenerate. A null enhanced (the reset a fresh
// transcription/check writes) must keep flowing for everyone.
describe("PATCH /api/writing-assessment/[id] (student regeneration lock)", () => {
  const ENHANCED: LanguageCheckEnhanced = {
    light: "Polished.",
    heavy: "Rewritten.",
    generatedAt: 1700000000000,
    model: "gpt-6.1-sol",
  };

  const enhancedPatch = () =>
    queries.find((q) =>
      q.sql.startsWith("UPDATE language_check_essays SET enhanced"),
    );

  it("rejects a student regenerating over the saved enhanced essays", async () => {
    role = "student";
    assessedRows = 1;
    const res = await PATCH(patch({ enhanced: ENHANCED }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(403);
    expect(enhancedPatch()).toBeUndefined();
    // The lock is checked against the essay the caller owns/uploaded.
    const guard = queries.find((q) =>
      q.sql.startsWith("SELECT 1 FROM language_check_essays"),
    )!;
    expect(guard.sql).toContain("enhanced IS NOT NULL");
    expect(guard.sql).toContain("OR uploaded_by = $");
    expect(guard.values[0]).toBe("essay-1");
  });

  it("lets a student save the FIRST enhanced essays", async () => {
    role = "student";
    assessedRows = 0;
    const res = await PATCH(patch({ enhanced: ENHANCED }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(enhancedPatch()).toBeDefined();
  });

  it("lets staff regenerate saved enhanced essays", async () => {
    role = "teacher";
    assessedRows = 1;
    const res = await PATCH(patch({ enhanced: ENHANCED }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(enhancedPatch()).toBeDefined();
    // No lock lookup for staff callers at all.
    expect(
      queries.find((q) =>
        q.sql.startsWith("SELECT 1 FROM language_check_essays"),
      ),
    ).toBeUndefined();
  });

  it("still lets a student PATCH the null reset a fresh check writes", async () => {
    role = "student";
    assessedRows = 1;
    const res = await PATCH(patch({ enhanced: null }), {
      params: Promise.resolve({ id: "essay-1" }),
    });
    expect(res.status).toBe(200);
    expect(enhancedPatch()).toBeDefined();
  });
});

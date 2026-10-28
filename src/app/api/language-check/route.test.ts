import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Teacher-uploaded essays: POST /api/language-check with a studentId must
// create the row owned by the STUDENT (so it lists/opens/feeds Learn for
// them exactly as a self-upload) with uploaded_by = the staff caller, and
// refuse non-staff or out-of-scope callers without inserting anything.

const queries: Array<{ sql: string; values: unknown[] }> = [];
let role: string | null = "teacher";
/** canUploadForStudent result: how many rows the scope check finds. */
let scopeRows = 1;

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
      if (flat.includes("SELECT 1 FROM users u")) return { rows: [], rowCount: scopeRows };
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
    nextUrl: new URL("http://localhost/api/language-check/essay-1"),
  } as unknown as NextRequest;
}

const insertQuery = () => queries.find((q) => q.sql.startsWith("WITH ins"))!;
const scopeQuery = () => queries.find((q) => q.sql.includes("SELECT 1 FROM users u"));

beforeEach(() => {
  queries.length = 0;
  role = "teacher";
  scopeRows = 1;
});

describe("POST /api/language-check (teacher upload)", () => {
  it("rejects anonymous callers", async () => {
    role = null;
    expect(
      (await POST(post({ images: [IMAGE], studentId: "s1" }))).status,
    ).toBe(401);
  });

  it("refuses studentId from a student without touching the database", async () => {
    role = "student";
    const res = await POST(post({ images: [IMAGE], studentId: "s1" }));
    expect(res.status).toBe(403);
    expect(queries).toHaveLength(0);
  });

  it("refuses a student outside the staff scope", async () => {
    scopeRows = 0;
    const res = await POST(post({ images: [IMAGE], studentId: "s1" }));
    expect(res.status).toBe(403);
    expect(insertQuery()).toBeUndefined();
    // Teacher scope: membership in the caller's classes, students only.
    expect(scopeQuery()!.sql).toContain("u.role = 'student'");
    expect(scopeQuery()!.sql).toContain("uc.teacher_id = $1");
    expect(scopeQuery()!.values[1]).toBe("s1");
  });

  it("creates the essay owned by the student, uploaded_by the teacher", async () => {
    const res = await POST(post({ images: [IMAGE], studentId: "s1" }));
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

  it("without studentId keeps the legacy self-owned insert", async () => {
    const res = await POST(post({ images: [IMAGE] }));
    expect(res.status).toBe(201);
    const insert = insertQuery();
    expect(insert.values[0]).toBe("teacher-1");
    expect(insert.values[1]).toBeNull();
  });
});

describe("PATCH /api/language-check/[id] (uploader access)", () => {
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

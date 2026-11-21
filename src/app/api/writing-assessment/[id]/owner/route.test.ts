import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Run the REAL owner-transfer route handler against a mocked pg pool and
// record the exact SQL. Regression tests for the mis-attribution fix: a
// staff member may move an essay they own (a forgotten "Myself" pick) or
// uploaded (aimed at the wrong learner) to a student in scope; ownership
// moves, everything else stays.

const queries: Array<{ sql: string; values: unknown[] }> = [];

/** Fixture knobs each test sets: current owner row + scope answers. */
let currentOwnerRow: Record<string, unknown> | null;
let targetInScope: boolean;

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
}));

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query: async (sql: string, values?: unknown[]) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: normalized, values: values ?? [] });
      if (normalized.includes("LEFT JOIN user_roles")) {
        // canUploadForStudent — SELECT 1 ... returns rowCount.
        return { rows: targetInScope ? [1] : [], rowCount: targetInScope ? 1 : 0 };
      }
      if (normalized.startsWith("SELECT user_id FROM language_check_essays")) {
        return { rows: currentOwnerRow ? [currentOwnerRow] : [] };
      }
      if (normalized.startsWith("UPDATE language_check_essays")) {
        return {
          rows: [{ owner_id: "s1", owner_name: "Amy Wong" }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  }),
}));

import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return {
    json: async () => body,
    params: undefined,
  } as unknown as NextRequest;
}

function makeContext() {
  return { params: Promise.resolve({ id: "essay-1" }) };
}

beforeEach(() => {
  queries.length = 0;
  targetInScope = true;
  currentOwnerRow = { user_id: "teacher-1" }; // the "left on Myself" case
});

describe("owner-transfer route: real handler, recorded SQL", () => {
  it("moves the essay and records the caller as the uploader", async () => {
    const res = await PATCH(makeRequest({ studentId: "s1" }), makeContext());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ownerId: "s1",
      ownerName: "Amy Wong",
    });
    const update = queries.find((q) => q.sql.startsWith("UPDATE language_check_essays"))!;
    // SET user_id, uploaded_by; WHERE id + (owner OR uploader) — uploaded_by
    // ($2) is the caller so the essay stays visible to them with the chip.
    expect(update.sql).toContain("SET user_id = $3, uploaded_by = $2");
    expect(update.sql).toContain("user_id = $2 OR uploaded_by = $2");
    expect(update.values).toEqual(["essay-1", "teacher-1", "s1"]);
  });

  it("rejects a move when the target is not an in-scope student", async () => {
    targetInScope = false;
    const res = await PATCH(makeRequest({ studentId: "colleague-9" }), makeContext());
    expect(res.status).toBe(403);
    expect(queries.some((q) => q.sql.startsWith("UPDATE"))).toBe(false);
  });

  it("rejects a move to the essay's current owner", async () => {
    currentOwnerRow = { user_id: "s1" }; // already a teacher upload for s1
    const res = await PATCH(makeRequest({ studentId: "s1" }), makeContext());
    expect(res.status).toBe(400);
    expect(queries.some((q) => q.sql.startsWith("UPDATE"))).toBe(false);
  });

  it("404s when the caller neither owns nor uploaded the essay", async () => {
    currentOwnerRow = null;
    const res = await PATCH(makeRequest({ studentId: "s1" }), makeContext());
    expect(res.status).toBe(404);
    expect(queries.some((q) => q.sql.startsWith("UPDATE"))).toBe(false);
  });
});

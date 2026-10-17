import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// The real route handlers with a mocked session and data layer: who may call
// what, and that nothing reaches the data layer when they may not.

let session: { user?: { id: string; role: string } } | null = null;
vi.mock("@/auth", () => ({ auth: async () => session }));

const lib = vi.hoisted(() => ({
  startSession: vi.fn(),
  listSessions: vi.fn(async () => []),
  getSession: vi.fn(async () => null),
  syncSession: vi.fn(async () => null),
  deleteSession: vi.fn(async () => false),
  getOwnDashboard: vi.fn(async () => ({})),
  getStaffDashboard: vi.fn(async () => ({})),
  listEvents: vi.fn(async () => ({ rows: [], total: 0 })),
  listStaffSessions: vi.fn(async () => ({ rows: [], total: 0 })),
  getStaffSession: vi.fn(async () => null),
}));
vi.mock("@/lib/language-check-learn", async () => ({
  ...lib,
  LearnValidationError: class extends Error {},
  safeTimeZone: (tz?: string) => tz || "UTC",
}));
vi.mock("@/lib/language-check", () => ({
  isStaffRole: (r?: string | null) => r === "teacher" || r === "admin" || r === "super-admin",
  resolveStaffScope: async (role: string, id: string) =>
    role === "teacher" ? { kind: "teacher", teacherId: id } : role === "super-admin" ? { kind: "all" } : null,
}));

import { GET as listGET, POST as startPOST } from "./route";
import { PATCH, DELETE } from "./[id]/route";
import { GET as dashboardGET } from "./dashboard/route";
import { GET as staffDashboardGET } from "./staff/dashboard/route";
import { GET as staffActivityGET } from "./staff/activity/route";
import { GET as staffSessionsGET } from "./staff/sessions/route";
import { GET as staffSessionGET } from "./staff/sessions/[id]/route";

const req = (query = "", body?: unknown) =>
  ({ nextUrl: new URL(`http://x/api?${query}`), json: async () => body }) as unknown as NextRequest;
const ctx = { params: Promise.resolve({ id: "s1" }) };

beforeEach(() => {
  session = null;
  Object.values(lib).forEach((f) => f.mockClear());
});

describe("learning routes", () => {
  it("everything needs a signed-in user", async () => {
    expect((await listGET()).status).toBe(401);
    expect((await startPOST(req("", {}) as unknown as Request)).status).toBe(401);
    expect((await PATCH(req("", {}), ctx)).status).toBe(401);
    expect((await DELETE(req(), ctx)).status).toBe(401);
    expect((await dashboardGET(req())).status).toBe(401);
    expect((await staffDashboardGET(req())).status).toBe(401);
    expect(lib.listSessions).not.toHaveBeenCalled();
  });

  it("students are refused every staff route and the data layer is never reached", async () => {
    session = { user: { id: "stu", role: "student" } };
    for (const res of [
      await staffDashboardGET(req()),
      await staffActivityGET(req()),
      await staffSessionsGET(req()),
      await staffSessionGET(req(), ctx),
    ]) {
      expect(res.status).toBe(403);
    }
    expect(lib.getStaffDashboard).not.toHaveBeenCalled();
    expect(lib.listEvents).not.toHaveBeenCalled();
    expect(lib.getStaffSession).not.toHaveBeenCalled();
  });

  it("a teacher gets their class scope; an admin without a resolvable scope is refused", async () => {
    session = { user: { id: "t1", role: "teacher" } };
    await staffDashboardGET(req("range=7&tz=Asia/Hong_Kong&userId=u9"));
    expect(lib.getStaffDashboard).toHaveBeenCalledWith(
      { kind: "teacher", teacherId: "t1" },
      expect.objectContaining({ range: 7, timeZone: "Asia/Hong_Kong", userId: "u9" }),
    );
    session = { user: { id: "a1", role: "admin" } };
    expect((await staffSessionsGET(req())).status).toBe(403);
  });

  it("the learner's own dashboard/activity ignore any user id in the query", async () => {
    session = { user: { id: "me", role: "student" } };
    await dashboardGET(req("range=30&userId=someone-else"));
    expect(lib.getOwnDashboard).toHaveBeenCalledWith("me", expect.objectContaining({ range: 30 }));
  });

  it("rejects invalid ranges and bodies with 400 before touching data", async () => {
    session = { user: { id: "me", role: "student" } };
    expect((await dashboardGET(req("range=13"))).status).toBe(400);
    const start = (body: unknown) => startPOST({ json: async () => body } as unknown as Request);
    expect((await start({ essayId: "e", categories: [], age: 15 })).status).toBe(400);
    expect((await PATCH({ json: async () => ({ events: [{ type: "quiz_completed", key: "k" }] }) } as unknown as NextRequest, ctx)).status).toBe(400);
    expect(lib.syncSession).not.toHaveBeenCalled();
  });

  it("maps a missing session to 404 and a start refusal to 409", async () => {
    session = { user: { id: "me", role: "student" } };
    expect((await PATCH({ json: async () => ({}) } as unknown as NextRequest, ctx)).status).toBe(404);
    expect((await DELETE(req(), ctx)).status).toBe(404);
    lib.startSession.mockResolvedValueOnce({ ok: false, reason: "essay-not-checked" });
    const res = await startPOST({ json: async () => ({ essayId: "e", categories: ["tense"], age: 15 }) } as unknown as Request);
    expect(res.status).toBe(409);
  });
});

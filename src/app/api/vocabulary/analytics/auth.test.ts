import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

let role: string | undefined = "student";
vi.mock("@/auth", () => ({
  auth: async () => (role ? { user: { id: "u1", role } } : null),
}));
vi.mock("@/lib/language-check", async () => ({
  isStaffRole: (r: string | undefined) => r === "teacher" || r === "admin" || r === "super-admin",
  resolveStaffScope: async () => ({ kind: "all" }),
}));
const mocks = vi.hoisted(() => ({
  getSelfVocabularyAnalytics: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/vocabulary-activity", () => ({
  getVocabularyAnalytics: async () => ({ ok: true }),
  getSelfVocabularyAnalytics: mocks.getSelfVocabularyAnalytics,
  listVocabularyActivity: async () => ({ rows: [], total: 0 }),
  listStaffReviewSessions: async () => ({ rows: [], total: 0 }),
  listAnalyticsStudents: async () => [],
  safeTimeZone: (tz: string | undefined) => tz ?? "UTC",
}));

import { GET as dashboard } from "./dashboard/route";
import { GET as activity } from "./activity/route";
import { GET as sessions } from "./sessions/route";
import { GET as students } from "./students/route";
import { GET as me } from "./me/route";

const req = (qs = "") =>
  ({ nextUrl: new URL(`http://localhost/x?${qs}`) }) as unknown as NextRequest;

describe("vocabulary analytics routes are staff-only", () => {
  for (const [name, handler] of Object.entries({ dashboard, activity, sessions, students })) {
    it(`${name}: 401 anonymous, 403 student, 200 staff`, async () => {
      role = undefined;
      expect((await handler(req())).status).toBe(401);
      role = "student";
      expect((await handler(req())).status).toBe(403);
      role = "teacher";
      expect((await handler(req())).status).toBe(200);
    });
  }

  it("rejects an unsupported range", async () => {
    role = "admin";
    expect((await dashboard(req("range=5"))).status).toBe(400);
  });
});

describe("GET /api/vocabulary/analytics/me is the caller's own data", () => {
  it("401 anonymous; any signed-in user may read their own", async () => {
    role = undefined;
    expect((await me(req())).status).toBe(401);
    role = "student";
    expect((await me(req())).status).toBe(200);
    role = "teacher";
    expect((await me(req())).status).toBe(200);
  });

  it("always scopes to the session user and drops client filters", async () => {
    role = "student";
    mocks.getSelfVocabularyAnalytics.mockClear();
    const res = await me(req("userId=someone-else&classId=k1&range=7&tz=Asia/Hong_Kong"));
    expect(res.status).toBe(200);
    expect(mocks.getSelfVocabularyAnalytics).toHaveBeenCalledWith("u1", {
      range: 7,
      timeZone: "Asia/Hong_Kong",
    });
  });

  it("rejects an unsupported range", async () => {
    expect((await me(req("range=5"))).status).toBe(400);
  });
});

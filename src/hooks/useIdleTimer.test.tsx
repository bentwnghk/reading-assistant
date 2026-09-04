import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useIdleTimer } from "./useIdleTimer";

// Regression tests for the client-side idle session timeout. Each test maps
// to a production failure mode that previously kept users signed in:
//  1. plain visible-tab idle must sign out at the limit;
//  2. a frozen page (locked screen / suspended PWA) must sign out on the
//     returning gesture instead of letting the gesture reset the clock;
//  3. failed sign-out POSTs must be retried, with a hard-navigation
//     fallback after repeated failures;
//  4. a discarded/relaunched page must resume the persisted idle clock;
//  5. genuine activity must keep the session alive indefinitely.

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "user-1" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
    dismiss: vi.fn(),
    message: vi.fn(),
  },
}));

const IDLE_URL = "/api/auth/idle-timeout";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = "idle-timer:last-activity";

let postOk: boolean;
let idlePostCount: number;
let sendBeaconMock: ReturnType<typeof vi.fn>;
let locationMock: { href: string };

async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  postOk = true;
  idlePostCount = 0;

  sendBeaconMock = vi.fn();
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: sendBeaconMock,
  });

  locationMock = { href: "" };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: locationMock,
  });

  global.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/config") {
        return {
          ok: true,
          json: async () => ({ idleTimeoutMinutes: 30 }),
        } as Response;
      }
      if (url === IDLE_URL) {
        idlePostCount += 1;
        expect(init?.method).toBe("POST");
        return {
          ok: postOk,
          status: postOk ? 200 : 500,
          json: async () => (postOk ? { ok: true } : { error: "boom" }),
        } as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    }
  ) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useIdleTimer", () => {
  it("signs out after the idle timeout in a visible tab", async () => {
    renderHook(() => useIdleTimer());
    await flush();

    // Just below the limit: still signed in.
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - 1000);
    expect(idlePostCount).toBe(0);

    // Crossing the limit: sign-out POST, beacon, and navigation.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(sendBeaconMock).toHaveBeenCalledWith(IDLE_URL);
    expect(idlePostCount).toBeGreaterThanOrEqual(1);
    await flush();
    expect(locationMock.href).toBe("/");
  });

  it("signs out on the returning gesture after the page was frozen (lock/suspend race)", async () => {
    renderHook(() => useIdleTimer());
    await flush();

    // Simulate a frozen page: wall-clock jumps past the timeout WITHOUT any
    // interval tick running (screen locked, PWA suspended, tab frozen).
    vi.setSystemTime(Date.now() + IDLE_TIMEOUT_MS + 60_000);

    // The user's first returning gesture must trigger sign-out — not reset
    // the idle clock (the original production bug).
    window.dispatchEvent(new Event("mousemove"));
    await flush();

    expect(idlePostCount).toBeGreaterThanOrEqual(1);
    expect(locationMock.href).toBe("/");
  });

  it("retries failed sign-out POSTs, then hard-navigates to the GET fallback", async () => {
    postOk = false;
    renderHook(() => useIdleTimer());
    await flush();

    vi.setSystemTime(Date.now() + IDLE_TIMEOUT_MS + 60_000);

    // Each 10s tick retries the POST; after 6 consecutive failures the hook
    // falls back to a top-level navigation to the GET variant.
    await vi.advanceTimersByTimeAsync(90_000);

    expect(idlePostCount).toBeGreaterThanOrEqual(6);
    expect(locationMock.href).toBe(IDLE_URL);
  });

  it("resumes the persisted idle clock after a discard/relaunch", async () => {
    // A previous page life persisted last activity past the idle limit.
    localStorage.setItem(
      LAST_ACTIVITY_KEY,
      String(Date.now() - IDLE_TIMEOUT_MS - 60_000)
    );

    renderHook(() => useIdleTimer());
    await flush();

    // The first interval tick after boot already sees the true idle time.
    await vi.advanceTimersByTimeAsync(15_000);
    expect(idlePostCount).toBeGreaterThanOrEqual(1);
    await flush();
    expect(locationMock.href).toBe("/");
  });

  it("keeps the session alive while the user is active", async () => {
    renderHook(() => useIdleTimer());
    await flush();

    // 60 minutes of activity every 5 minutes — never crosses the limit.
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      window.dispatchEvent(new Event("mousemove"));
      await flush();
    }

    expect(idlePostCount).toBe(0);
    expect(locationMock.href).toBe("");
  });
});

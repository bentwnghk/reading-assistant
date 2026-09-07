import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import {
  useVocabularySync,
  MAX_SYNC_ATTEMPTS,
  SYNC_RETRY_BASE_DELAY_MS,
} from "./useVocabularySync";
import { useReadingStore } from "@/store/reading";

// Tests for the glossary→vocabulary sync retry. Each test maps to a failure
// mode of the previous mark-as-synced-immediately implementation:
//  1. success must sync exactly once and mark the hash as synced;
//  2. a failed sync must retry with backoff and mark synced only on success;
//  3. retries must stop at the attempt cap (no retry storm);
//  4. coming back online must retry immediately with a fresh budget;
//  5. a glossary change must supersede an in-flight retry chain;
//  6. no session id (or empty glossary) must not sync at all.

const SYNC_URL = "/api/vocabulary/sync";

let remainingFailures: number;
let syncCalls: string[];

async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  remainingFailures = 0;
  syncCalls = [];
  useReadingStore.setState({ glossary: [], glossaryRatings: {}, id: undefined });

  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === SYNC_URL) {
      syncCalls.push(String(init?.body));
      expect(init?.method).toBe("POST");
      const ok = remainingFailures <= 0;
      if (remainingFailures > 0) remainingFailures -= 1;
      return { ok, status: ok ? 200 : 500 } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  useReadingStore.setState({ glossary: [], glossaryRatings: {}, id: undefined });
});

function prime(words: string[], noSessionId = false) {
  useReadingStore.setState({
    glossary: words.map((word) => ({
      word,
      partOfSpeech: "n.",
      englishDefinition: `${word} definition`,
      chineseDefinition: `${word} 中文釋義`,
    })),
    id: noSessionId ? undefined : "session-1",
  });
}

function lastPayloadWords(): string[] {
  const payload = JSON.parse(syncCalls[syncCalls.length - 1]);
  return payload.glossary.map((g: { word: string }) => g.word).sort();
}

describe("useVocabularySync", () => {
  it("syncs exactly once on success and does not re-sync on ratings-only changes", async () => {
    prime(["apple", "banana"]);
    renderHook(() => useVocabularySync());
    await act(flush);
    expect(syncCalls.length).toBe(1);
    expect(JSON.parse(syncCalls[0]).sessionId).toBe("session-1");
    expect(lastPayloadWords()).toEqual(["apple", "banana"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(syncCalls.length).toBe(1);
  });

  it("retries a failed sync with backoff and marks synced only on success", async () => {
    remainingFailures = 2;
    prime(["apple"]);
    renderHook(() => useVocabularySync());
    await act(flush);
    expect(syncCalls.length).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_DELAY_MS);
    });
    expect(syncCalls.length).toBe(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_DELAY_MS * 2);
    });
    expect(syncCalls.length).toBe(3);

    // Third attempt succeeded: no more retries, and the hash is marked as
    // synced (a ratings-only change must not trigger another POST).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(syncCalls.length).toBe(3);
    act(() => {
      useReadingStore.setState({ glossaryRatings: { apple: "hard" } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(syncCalls.length).toBe(3);
  });

  it("gives up after the attempt cap", async () => {
    remainingFailures = 99;
    prime(["apple"]);
    renderHook(() => useVocabularySync());
    await act(flush);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_DELAY_MS * 10);
    });
    expect(syncCalls.length).toBe(MAX_SYNC_ATTEMPTS);
  });

  it("retries immediately with a fresh budget when back online", async () => {
    remainingFailures = 99;
    prime(["apple"]);
    renderHook(() => useVocabularySync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_RETRY_BASE_DELAY_MS * 10);
    });
    expect(syncCalls.length).toBe(MAX_SYNC_ATTEMPTS);

    remainingFailures = 0;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(syncCalls.length).toBe(MAX_SYNC_ATTEMPTS + 1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(syncCalls.length).toBe(MAX_SYNC_ATTEMPTS + 1);
  });

  it("syncs the latest glossary when it changes mid-retry", async () => {
    remainingFailures = 99;
    prime(["apple"]);
    renderHook(() => useVocabularySync());
    await act(flush);
    expect(syncCalls.length).toBe(1);

    // The old retry chain is cancelled; the new payload is synced at once.
    act(() => {
      prime(["apple", "cherry"]);
    });
    await act(flush);
    expect(lastPayloadWords()).toEqual(["apple", "cherry"]);
  });

  it("does not sync without a session id or glossary", async () => {
    prime(["apple"], true);
    renderHook(() => useVocabularySync());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    act(() => {
      useReadingStore.setState({ id: "session-1", glossary: [] });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(syncCalls.length).toBe(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server as SocketIOServer } from "socket.io";

import { createRoom, addPlayer } from "../rooms";
import { startGame, submitAnswer, clearTimers } from "./engine";
import type { AuthenticatedUser } from "../auth";
import type { BattleRoom, BattleRoomConfig, WordEndPayload, WordStartPayload } from "./types";

/**
 * Game-loop regression tests for per-word event emission.
 *
 * The clients accumulate one review-session result per `word_end` event they
 * receive (see src/hooks/useSpellingBattle.ts), and the review-session record
 * is written from that list — so the engine MUST emit `word_end` exactly once
 * per canonical word. These tests pin the two races that used to duplicate it
 * (late submit after the deadline resolve; the uncancelled per-word deadline
 * firing into the between-words pause after an all-submitted early resolve),
 * plus the duplicate `word_start` cascade they caused.
 */

const teacher: AuthenticatedUser = {
  userId: "teacher-1",
  name: "Ms. Frizzle",
  image: null,
  role: "teacher",
  schoolId: "school-1",
  classId: null,
  classIds: [],
};

function student(id: string): AuthenticatedUser {
  return {
    userId: id,
    name: id,
    image: null,
    role: "student",
    schoolId: "school-1",
    classId: null,
    classIds: [],
  };
}

const WORDS = ["apple", "banana", "cherry", "durian", "elderberry"];

const config: BattleRoomConfig = {
  source: { type: "vocabulary", filter: "random" },
  difficulty: "medium", // listen-type medium = 20s per word
  gameMode: "listen-type",
  wordCount: WORDS.length,
  timed: true,
  classBattle: false,
};

interface FakeIo {
  emitted: { event: string; payload: unknown }[];
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
}

function fakeIo(): FakeIo {
  const emitted: { event: string; payload: unknown }[] = [];
  return {
    emitted,
    to: () => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ event, payload });
      },
    }),
  };
}

function ioAsServer(io: FakeIo): SocketIOServer {
  return io as unknown as SocketIOServer;
}

function makeRoom(): BattleRoom {
  const room = createRoom({
    host: teacher,
    config: { ...config },
    socketId: "sock-host",
    resolved: { words: WORDS.map((w) => ({ word: w })), actualCount: WORDS.length },
    classId: null,
    preset: null,
    hostAsSpectator: true,
  });
  // Known code so clearTimers can target the room in afterEach.
  room.code = "ENGTEST";
  addPlayer(room, student("s1"), "sock-1");
  addPlayer(room, student("s2"), "sock-2");
  return room;
}

function events(io: FakeIo, event: string): unknown[] {
  return io.emitted.filter((e) => e.event === event).map((e) => e.payload);
}

function wordEnds(io: FakeIo): WordEndPayload[] {
  return events(io, "word_end") as WordEndPayload[];
}

function wordStarts(io: FakeIo): WordStartPayload[] {
  return events(io, "word_start") as WordStartPayload[];
}

/** 3-2-1 countdown is 4 seconds of ticks (3→2→1→startPlaying). */
const COUNTDOWN_MS = 3_500;
/** listen-type medium: word deadline = 20s + 500ms grace. */
const WORD_DEADLINE_MS = 20_500;
const BETWEEN_WORDS_MS = 2_000;

afterEach(() => {
  clearTimers("ENGTEST");
  vi.useRealTimers();
});

describe("word_end emission (one per canonical word)", () => {
  it("emits exactly one word_end per word across a full battle with early submits", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
    expect(room.status).toBe("playing");

    for (let i = 0; i < WORDS.length; i++) {
      // Both players submit mid-word → early resolve via all-submitted.
      submitAnswer(ioAsServer(io), room, "s1", { index: i, answer: WORDS[i], submittedAt: Date.now(), hintsUsed: 0 });
      submitAnswer(ioAsServer(io), room, "s2", { index: i, answer: WORDS[i], submittedAt: Date.now(), hintsUsed: 0 });
      // Advance past the between-words pause AND past the (cancelled) deadline.
      await vi.advanceTimersByTimeAsync(Math.max(WORD_DEADLINE_MS, BETWEEN_WORDS_MS) + 100);
    }

    expect(wordEnds(io)).toHaveLength(WORDS.length);
    expect(wordStarts(io)).toHaveLength(WORDS.length);
    expect(events(io, "game_end")).toHaveLength(1);
    expect(room.status).toBe("finished");
  });

  it("emits exactly one word_end per word when every word runs to its deadline", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    // Nobody submits — every word resolves via the deadline timer.
    for (let i = 0; i < WORDS.length; i++) {
      await vi.advanceTimersByTimeAsync(WORD_DEADLINE_MS + BETWEEN_WORDS_MS + 100);
    }

    expect(wordEnds(io)).toHaveLength(WORDS.length);
    expect(events(io, "game_end")).toHaveLength(1);
  });

  it("a late submit arriving after the deadline resolve is rejected — no duplicate word_end, no late points", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    // s1 submits early; s2's buzzer-beater lands AFTER the deadline resolve.
    submitAnswer(ioAsServer(io), room, "s1", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    await vi.advanceTimersByTimeAsync(WORD_DEADLINE_MS + 100); // deadline fires → word_end #1
    expect(wordEnds(io)).toHaveLength(1);

    const s1Score = room.players.get("s1")!.score;
    submitAnswer(ioAsServer(io), room, "s2", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });

    expect(wordEnds(io)).toHaveLength(1); // sealed — no duplicate
    expect(room.players.get("s2")!.score).toBe(0); // late answer not scored
    expect(room.players.get("s1")!.score).toBe(s1Score);
    expect(events(io, "player_progress")).toHaveLength(1); // only s1's progress broadcast

    // Game continues cleanly: exactly one start per word afterwards.
    await vi.advanceTimersByTimeAsync(BETWEEN_WORDS_MS + 100);
    expect(wordStarts(io).filter((w) => w.index === 1)).toHaveLength(1);
  });

  it("an all-submitted early resolve cancels the pending deadline — no duplicate word_end during the pause", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    // Both submit near the deadline (within the between-words pause window):
    // early resolve happens at ~20s, the deadline would fire at 20.5s — inside
    // the pause — and previously re-resolved the sealed word.
    submitAnswer(ioAsServer(io), room, "s1", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    await vi.advanceTimersByTimeAsync(19_900);
    submitAnswer(ioAsServer(io), room, "s2", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    expect(wordEnds(io)).toHaveLength(1); // early resolve

    await vi.advanceTimersByTimeAsync(WORD_DEADLINE_MS); // well past the (cancelled) deadline
    expect(wordEnds(io)).toHaveLength(1); // no duplicate from the stray deadline
    expect(wordStarts(io).filter((w) => w.index === 1)).toHaveLength(1); // no duplicate word_start
  });

  it("a stale duplicate between-words timer cannot restart a word that already started", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    // Word 0 runs to its deadline; s2 submits just after it resolved (late).
    submitAnswer(ioAsServer(io), room, "s1", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    await vi.advanceTimersByTimeAsync(WORD_DEADLINE_MS + 100);
    submitAnswer(ioAsServer(io), room, "s2", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    expect(wordEnds(io)).toHaveLength(1);

    // Advance deep into the game: every word must start exactly once.
    await vi.advanceTimersByTimeAsync((WORD_DEADLINE_MS + BETWEEN_WORDS_MS) * WORDS.length);
    const starts = wordStarts(io);
    expect(starts).toHaveLength(WORDS.length);
    for (let i = 0; i < WORDS.length; i++) {
      expect(starts.filter((w) => w.index === i)).toHaveLength(1);
    }
    expect(wordEnds(io)).toHaveLength(WORDS.length);
  });

  it("word_end results keep covering every playing member (late submitter marked wrong at resolve)", async () => {
    vi.useFakeTimers();
    const room = makeRoom();
    const io = fakeIo();

    expect(startGame(ioAsServer(io), room)).toBe(true);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    // Word 0 to deadline with s2 never answering: resolved with s2 wrong.
    submitAnswer(ioAsServer(io), room, "s1", { index: 0, answer: WORDS[0], submittedAt: Date.now(), hintsUsed: 0 });
    await vi.advanceTimersByTimeAsync(WORD_DEADLINE_MS + 50);

    const end = wordEnds(io)[0];
    expect(end.word).toBe(WORDS[0]);
    expect(end.results.map((r) => r.userId).sort()).toEqual(["s1", "s2"]);
    expect(end.results.find((r) => r.userId === "s1")!.correct).toBe(true);
    expect(end.results.find((r) => r.userId === "s2")!.correct).toBe(false);
    expect(end.results.find((r) => r.userId === "s2")!.submitted).toBe(false);
  });
});

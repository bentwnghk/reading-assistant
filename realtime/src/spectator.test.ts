import { afterEach, describe, expect, it } from "vitest";
import type { Server as SocketIOServer } from "socket.io";

import { createRoom, addPlayer, countPresentPlayers, markDisconnected, removePlayer, toRoomStatePayload } from "./rooms";
import { startGame, submitAnswer, clearTimers } from "./game/engine";
import type { AuthenticatedUser } from "./auth";
import type { BattleRoom, BattleRoomConfig, WordEndPayload } from "./game/types";

/**
 * Host-as-spectator rules (staff-only creation option):
 *  - the spectator occupies a host seat but never counts as a playing member
 *  - the engine's 2-player start gate, submissions, word results and rankings
 *    all exclude the spectator
 *  - host transfer prefers playing members over spectators
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

const config: BattleRoomConfig = {
  source: { type: "vocabulary", filter: "random" },
  difficulty: "medium",
  gameMode: "listen-type",
  wordCount: 2,
  timed: true,
  classBattle: false,
};

const resolved = {
  words: [{ word: "apple" }, { word: "banana" }],
  actualCount: 2,
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

function makeRoom(hostAsSpectator: boolean): BattleRoom {
  return createRoom({
    host: teacher,
    config: { ...config },
    socketId: "sock-host",
    resolved: { words: [...resolved.words], actualCount: resolved.actualCount },
    classId: null,
    preset: null,
    hostAsSpectator,
  });
}

afterEach(() => {
  clearTimers("TESTROOM");
});

function setupPlayingRoom(): { room: BattleRoom; io: FakeIo } {
  const room = makeRoom(true);
  // Override the generated code so clearTimers can target a known key.
  room.code = "TESTROOM";
  room.status = "playing";
  room.currentIndex = 0;
  room.wordStartedAt = Date.now() - 500;
  const io = fakeIo();
  return { room, io };
}

describe("host-as-spectator room seat", () => {
  it("marks the host as a spectator when requested and not otherwise", () => {
    const spectating = makeRoom(true);
    expect(spectating.players.get(teacher.userId)?.spectator).toBe(true);
    const playing = makeRoom(false);
    expect(playing.players.get(teacher.userId)?.spectator).toBe(false);
  });

  it("exposes spectator flags in the public room-state payload", () => {
    const room = makeRoom(true);
    addPlayer(room, student("s1"), "sock-1");
    const state = toRoomStatePayload(room);
    const host = state.players.find((p) => p.userId === teacher.userId);
    const player = state.players.find((p) => p.userId === "s1");
    expect(host?.spectator).toBe(true);
    expect(player?.spectator).toBe(false);
  });

  it("counts only present playing members in countPresentPlayers", () => {
    const room = makeRoom(true); // host = spectator
    expect(countPresentPlayers(room)).toBe(0);
    addPlayer(room, student("s1"), "sock-1");
    addPlayer(room, student("s2"), "sock-2");
    expect(countPresentPlayers(room)).toBe(2);
    markDisconnected(room, "s1", Date.now());
    expect(countPresentPlayers(room)).toBe(1);
    // Spectator host disconnecting must not change the playing count.
    markDisconnected(room, teacher.userId, Date.now());
    expect(countPresentPlayers(room)).toBe(1);
  });

  it("preserves the spectator flag across reconnects", () => {
    const room = makeRoom(true);
    markDisconnected(room, teacher.userId, Date.now());
    const rebound = addPlayer(room, teacher, "sock-host-2");
    expect(rebound?.spectator).toBe(true);
    expect(rebound?.status).toBe("present");
  });

  it("transfers host-ship to a playing member (not a spectator) when the host leaves", () => {
    const room = makeRoom(true);
    addPlayer(room, student("s1"), "sock-1");
    const result = removePlayer(room, teacher.userId);
    expect(result.newHostId).toBe("s1");
    expect(room.players.get("s1")?.spectator).toBe(false);
  });

  it("falls back to a spectator only when no playing member remains", () => {
    const room = makeRoom(true);
    addPlayer(room, student("s1"), "sock-1");
    room.players.get("s1")!.spectator = true; // synthetic: two spectators
    const result = removePlayer(room, teacher.userId);
    expect(result.newHostId).toBe("s1"); // any seat beats destroying the room
  });
});

describe("host-as-spectator engine rules", () => {
  it("cannot start with fewer than 2 present playing members even though the host is present", () => {
    const room = makeRoom(true);
    room.code = "TESTROOM";
    addPlayer(room, student("s1"), "sock-1");
    const io = fakeIo();
    expect(startGame(ioAsServer(io), room)).toBe(false);
    expect(room.status).toBe("lobby");
    addPlayer(room, student("s2"), "sock-2");
    expect(startGame(ioAsServer(io), room)).toBe(true);
    expect(room.status).toBe("countdown");
  });

  it("rejects answer submissions from the spectator host", () => {
    const { room, io } = setupPlayingRoom();
    submitAnswer(ioAsServer(io), room, teacher.userId, { index: 0, answer: "apple", submittedAt: Date.now(), hintsUsed: 0 });
    const host = room.players.get(teacher.userId)!;
    expect(host.score).toBe(0);
    expect(room.wordSubmissions.has(teacher.userId)).toBe(false);
    expect(io.emitted.filter((e) => e.event === "player_progress")).toHaveLength(0);
  });

  it("resolves a word once all playing members submitted, with the spectator absent from results", () => {
    const { room, io } = setupPlayingRoom();
    addPlayer(room, student("s1"), "sock-1");
    addPlayer(room, student("s2"), "sock-2");
    // Spectator (present, never submits) must not hold the word open.
    submitAnswer(ioAsServer(io), room, "s1", { index: 0, answer: "apple", submittedAt: Date.now(), hintsUsed: 0 });
    expect(io.emitted.find((e) => e.event === "word_end")).toBeUndefined();
    submitAnswer(ioAsServer(io), room, "s2", { index: 0, answer: "aple", submittedAt: Date.now(), hintsUsed: 0 });
    const wordEnd = io.emitted.find((e) => e.event === "word_end");
    expect(wordEnd).toBeDefined();
    const results = (wordEnd!.payload as WordEndPayload).results;
    expect(results.map((r) => r.userId).sort()).toEqual(["s1", "s2"]);
    expect(results.find((r) => r.userId === teacher.userId)).toBeUndefined();
  });
});

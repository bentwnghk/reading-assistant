import { beforeEach, describe, expect, it } from "vitest";

import {
  addPlayer,
  countActiveRoomsByHost,
  createRoom,
  destroyRoom,
  findRoomByPlayer,
  findRosterBattleInvites,
  generateRoomCode,
  getRoom,
  normalizeCode,
  removePlayer,
  toRoomStatePayload,
} from "./rooms";
import type { AuthenticatedUser } from "./auth";
import type { BattleRoom, BattleRoomConfig } from "./game/types";

function fakeUser(id: string): AuthenticatedUser {
  return { userId: id, name: id, image: null, role: "student", schoolId: null, classId: null, classIds: [] };
}

const baseConfig: BattleRoomConfig = {
  source: { type: "vocabulary" },
  difficulty: "medium",
  gameMode: "listen-type",
  wordCount: 5,
  timed: true,
  classBattle: false,
};

function makeRoom(hostId: string): BattleRoom {
  return createRoom({
    host: fakeUser(hostId),
    config: baseConfig,
    socketId: "sock-" + hostId,
    resolved: { words: [{ word: "test" }], actualCount: 1 },
    classId: null,
    preset: null,
  });
}

function makeRosterRoom(hostId: string, presetId: string, studentIds: string[]): BattleRoom {
  return createRoom({
    host: fakeUser(hostId),
    config: { ...baseConfig, classBattle: true },
    socketId: "sock-" + hostId,
    resolved: { words: [{ word: "test" }], actualCount: 1 },
    classId: null,
    preset: { id: presetId, name: "Battle Roster", studentIds },
  });
}

describe("generateRoomCode", () => {
  it("produces a 6-char uppercase code", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it("excludes ambiguous characters (O, 0, 1, I)", () => {
    // Vanishingly unlikely to never appear, but the alphabet excludes them.
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[O01I]/);
    }
  });
});

describe("normalizeCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCode("  abc123  ")).toBe("ABC123");
  });
});

describe("room lifecycle", () => {
  beforeEach(() => {
    // Best-effort cleanup of module state between tests.
    // (createRoom adds to the module map; we can't enumerate easily, so tests
    // below use unique host ids to avoid interference.)
  });

  it("createRoom + getRoom round-trip", () => {
    const room = makeRoom("creator-1");
    expect(getRoom(room.code)).toBe(room);
    expect(room.hostId).toBe("creator-1");
    expect(room.players.size).toBe(1);
    expect(room.status).toBe("lobby");
    expect(room.actualWordCount).toBe(1);
  });

  it("findRoomByPlayer locates a player's room", () => {
    const room = makeRoom("finder-1");
    expect(findRoomByPlayer("finder-1")?.code).toBe(room.code);
    expect(findRoomByPlayer("nobody")).toBeNull();
  });

  it("countActiveRoomsByHost counts non-finished rooms", () => {
    const before = countActiveRoomsByHost("counter-1");
    makeRoom("counter-1");
    expect(countActiveRoomsByHost("counter-1")).toBe(before + 1);
  });

  it("destroyRoom removes the room", () => {
    const room = makeRoom("destroyer-1");
    expect(destroyRoom(room.code)).toBe(true);
    expect(getRoom(room.code)).toBeNull();
  });
});

describe("addPlayer / removePlayer", () => {
  it("addPlayer adds a new player up to the cap", () => {
    const room = makeRoom("host-add");
    const p = addPlayer(room, fakeUser("guest-add"), "sock-guest");
    expect(p).not.toBeNull();
    expect(room.players.size).toBe(2);
  });

  it("addPlayer rebinds an existing player (reconnect) instead of adding a seat", () => {
    const room = makeRoom("host-reconnect");
    addPlayer(room, fakeUser("guest-rc"), "sock-a");
    expect(room.players.size).toBe(2);
    // Reconnect with a new socket id.
    addPlayer(room, fakeUser("guest-rc"), "sock-b");
    expect(room.players.size).toBe(2); // no duplicate seat
    expect(room.players.get("guest-rc")?.socketId).toBe("sock-b");
    expect(room.players.get("guest-rc")?.status).toBe("present");
  });

  it("removePlayer transfers host-ship when the host leaves", () => {
    const room = makeRoom("host-x");
    addPlayer(room, fakeUser("guest-a"), "sock-a");
    addPlayer(room, fakeUser("guest-b"), "sock-b");

    const result = removePlayer(room, "host-x");
    expect(result.removed).toBe(true);
    expect(result.newHostId).not.toBe("host-x"); // transferred
    expect(result.newHostId).toBe("guest-a"); // first remaining present player
    expect(room.players.size).toBe(2);
    expect(room.hostId).toBe("guest-a");
  });

  it("removePlayer reports empty when the last player leaves", () => {
    const room = makeRoom("solo-host");
    const result = removePlayer(room, "solo-host");
    expect(result.removed).toBe(true);
    expect(result.empty).toBe(true);
    expect(result.newHostId).toBeNull();
  });
});

describe("toRoomStatePayload", () => {
  it("builds a public payload without canonical words", () => {
    const room = makeRoom("payload-host");
    addPlayer(room, fakeUser("payload-guest"), "sock-pg");
    const payload = toRoomStatePayload(room);

    expect(payload.roomCode).toBe(room.code);
    expect(payload.hostId).toBe("payload-host");
    expect(payload.players).toHaveLength(2);
    expect(payload.players[0].isHost).toBe(true);
    // The canonical word list must NOT leak into the public payload.
    expect(JSON.stringify(payload)).not.toContain("canonicalWords");
    expect(payload.actualWordCount).toBe(1);
    expect(payload.currentIndex).toBe(-1);
  });
});

describe("roster battles", () => {
  it("createRoom stores the preset target on the room", () => {
    const room = makeRosterRoom("roster-host-1", "preset-1", ["s1", "s2"]);
    expect(room.classBattle).toBe(true);
    expect(room.presetId).toBe("preset-1");
    expect(room.presetName).toBe("Battle Roster");
    expect(room.targetUserIds).toEqual(new Set(["s1", "s2"]));
    expect(room.classId).toBeNull();
  });

  it("findRosterBattleInvites returns lobby invites for roster members only", () => {
    const room = makeRosterRoom("roster-host-2", "preset-2", ["roster-a", "roster-b"]);
    const invites = findRosterBattleInvites("roster-a");
    expect(invites).toHaveLength(1);
    expect(invites[0].roomCode).toBe(room.code);
    expect(invites[0].className).toBe("Battle Roster");
    expect(invites[0].hostName).toBe("roster-host-2");
    // Non-members (including the host) get no invite.
    expect(findRosterBattleInvites("roster-c")).toHaveLength(0);
    expect(findRosterBattleInvites("roster-host-2")).toHaveLength(0);
  });

  it("findRosterBattleInvites excludes rooms that already started", () => {
    const room = makeRosterRoom("roster-host-3", "preset-3", ["roster-x"]);
    room.status = "playing";
    expect(findRosterBattleInvites("roster-x")).toHaveLength(0);
  });
});

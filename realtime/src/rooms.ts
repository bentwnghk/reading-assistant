/**
 * In-memory room registry for multiplayer spelling battles.
 *
 * Single-instance (v1). For horizontal scaling, the Socket.io Redis adapter
 * plus a shared room store (e.g. Redis) would be needed — noted as future work.
 *
 * Rooms are keyed by a 6-char code (ambiguous chars O/0/1/I excluded). A user
 * may be in at most one room at a time. The host owns the room; on host leave,
 * host-ship transfers to the next present player. Empty/idle rooms are pruned
 * by pruneIdleRooms() (called periodically from server.ts).
 */
import { config } from "./config";
import type { AuthenticatedUser } from "./auth";
import type {
  BattleGameMode,
  BattleRoom,
  BattleRoomConfig,
  BattleWord,
  PlayerSummary,
  RoomPlayer,
  RoomStatePayload,
  SpellingDifficulty,
  WordSource,
} from "./game/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O / 0 / 1 / I
const CODE_LENGTH = 6;

const rooms = new Map<string, BattleRoom>();

export function generateRoomCode(): string {
  for (let attempt = 0; attempt < 16; attempt++) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  // Vanishingly unlikely; recurse as a last resort.
  return generateRoomCode();
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getRoom(rawCode: string): BattleRoom | null {
  return rooms.get(normalizeCode(rawCode)) ?? null;
}

export function findRoomByPlayer(userId: string): BattleRoom | null {
  for (const room of rooms.values()) {
    if (room.players.has(userId)) return room;
  }
  return null;
}

export function countActiveRoomsByHost(hostId: string): number {
  let count = 0;
  for (const room of rooms.values()) {
    if (room.hostId === hostId && room.status !== "finished") count++;
  }
  return count;
}

function newPlayer(user: AuthenticatedUser, socketId: string): RoomPlayer {
  return {
    userId: user.userId,
    name: user.name,
    image: user.image,
    role: user.role,
    socketId,
    status: "present",
    disconnectedAt: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    lastSubmittedIndex: -1,
    finished: false,
  };
}

export interface CreateRoomInput {
  host: AuthenticatedUser;
  config: BattleRoomConfig;
  socketId: string;
  resolved: { words: BattleWord[]; actualCount: number };
  classId: string | null;
  /** Roster (assignment preset) target for roster battles; null otherwise. */
  preset: { id: string; name: string; studentIds: string[] } | null;
}

export function createRoom(input: CreateRoomInput): BattleRoom {
  const code = generateRoomCode();
  const now = Date.now();
  const room: BattleRoom = {
    code,
    hostId: input.host.userId,
    status: "lobby",
    config: input.config,
    players: new Map(),
    createdAt: now,
    lastActivityAt: now,
    classBattle: input.config.classBattle,
    classId: input.classId,
    presetId: input.preset?.id ?? null,
    presetName: input.preset?.name ?? null,
    targetUserIds: input.preset ? new Set(input.preset.studentIds) : null,
    canonicalWords: input.resolved.words,
    actualWordCount: input.resolved.actualCount,
    currentIndex: -1,
    wordStartedAt: 0,
    wordSubmissions: new Set(),
    wordResults: new Map(),
  };
  room.players.set(input.host.userId, newPlayer(input.host, input.socketId));
  rooms.set(code, room);
  return room;
}

/** Add (or rebind) a player to a room. Returns the player, or null if full. */
export function addPlayer(room: BattleRoom, user: AuthenticatedUser, socketId: string): RoomPlayer | null {
  const existing = room.players.get(user.userId);
  if (existing) {
    // Reconnect / new tab: rebind socket and mark present.
    existing.socketId = socketId;
    existing.status = "present";
    existing.disconnectedAt = null;
    touchRoom(room);
    return existing;
  }
  if (room.players.size >= config.maxPlayersPerRoom) return null;
  const player = newPlayer(user, socketId);
  room.players.set(user.userId, player);
  touchRoom(room);
  return player;
}

export interface RemovePlayerResult {
  removed: boolean;
  newHostId: string | null;
  empty: boolean;
}

/** Remove a player. Transfers host-ship if the host left. Does NOT destroy the room. */
export function removePlayer(room: BattleRoom, userId: string): RemovePlayerResult {
  const existed = room.players.delete(userId);
  let newHostId: string | null = null;
  if (existed && room.hostId === userId) {
    // Transfer host to the next present player (insertion order).
    for (const candidate of room.players.values()) {
      if (candidate.status === "present") {
        room.hostId = candidate.userId;
        newHostId = candidate.userId;
        break;
      }
    }
  }
  touchRoom(room);
  return { removed: existed, newHostId, empty: room.players.size === 0 };
}

export function destroyRoom(rawCode: string): boolean {
  const code = normalizeCode(rawCode);
  return rooms.delete(code);
}

/** Mark a player disconnected (within grace window); they keep their seat + score. */
export function markDisconnected(room: BattleRoom, userId: string, at: number): void {
  const player = room.players.get(userId);
  if (player && player.status === "present") {
    player.status = "disconnected";
    player.disconnectedAt = at;
    touchRoom(room);
  }
}

/** Restore a reconnecting player to present. */
export function markReconnected(room: BattleRoom, userId: string, socketId: string): void {
  const player = room.players.get(userId);
  if (player) {
    player.status = "present";
    player.disconnectedAt = null;
    player.socketId = socketId;
    touchRoom(room);
  }
}

export function touchRoom(room: BattleRoom): void {
  room.lastActivityAt = Date.now();
}

export function setRoomSource(
  room: BattleRoom,
  source: WordSource,
  resolved: { words: BattleWord[]; actualCount: number },
): void {
  room.config.source = source;
  room.canonicalWords = resolved.words;
  room.actualWordCount = resolved.actualCount;
  touchRoom(room);
}

/** Destroy rooms that are empty AND have been idle longer than the TTL. */
export function pruneIdleRooms(now: number = Date.now()): string[] {
  const destroyed: string[] = [];
  for (const [code, room] of rooms) {
    const isEmpty = room.players.size === 0;
    const idleTooLong = now - room.lastActivityAt > config.roomIdleTtlMs;
    if (isEmpty && idleTooLong) {
      rooms.delete(code);
      destroyed.push(code);
    }
  }
  return destroyed;
}

/** Public invite summary returned by the pending-invites endpoint. */
export interface BattleInviteSummary {
  roomCode: string;
  hostName: string | null;
  /** Class name — or the roster (preset) name for roster battles. */
  className: string | null;
  actualWordCount: number;
  difficulty: SpellingDifficulty;
  gameMode: BattleGameMode;
}

/** Return simplified invite objects for class-battle rooms targeting the given class. */
export function findClassBattleInvites(classId: string): BattleInviteSummary[] {
  const invites: BattleInviteSummary[] = [];
  for (const room of rooms.values()) {
    if (room.classBattle && room.classId === classId && room.status === "lobby") {
      const hostPlayer = room.players.get(room.hostId);
      invites.push({
        roomCode: room.code,
        hostName: hostPlayer?.name ?? null,
        className: null,
        actualWordCount: room.actualWordCount,
        difficulty: room.config.difficulty,
        gameMode: room.config.gameMode,
      });
    }
  }
  return invites;
}

/**
 * Return invite objects for roster-battle rooms whose roster (assignment
 * preset) contains the given user. Roster invites reach students who may have
 * no class at all, so lookup is by userId, not classId.
 */
export function findRosterBattleInvites(userId: string): BattleInviteSummary[] {
  const invites: BattleInviteSummary[] = [];
  for (const room of rooms.values()) {
    if (room.classBattle && room.targetUserIds?.has(userId) && room.status === "lobby") {
      const hostPlayer = room.players.get(room.hostId);
      invites.push({
        roomCode: room.code,
        hostName: hostPlayer?.name ?? null,
        className: room.presetName,
        actualWordCount: room.actualWordCount,
        difficulty: room.config.difficulty,
        gameMode: room.config.gameMode,
      });
    }
  }
  return invites;
}

/** Build the public room-state payload (canonical words are NOT included). */
export function toRoomStatePayload(room: BattleRoom): RoomStatePayload {
  const players: PlayerSummary[] = [];
  for (const p of room.players.values()) {
    players.push({
      userId: p.userId,
      name: p.name,
      image: p.image,
      role: p.role,
      isHost: room.hostId === p.userId,
      status: p.status,
      score: p.score,
      streak: p.streak,
      correctCount: p.correctCount,
      finished: p.finished,
    });
  }
  return {
    roomCode: room.code,
    status: room.status,
    config: room.config,
    hostId: room.hostId,
    players,
    actualWordCount: room.actualWordCount,
    classBattle: room.classBattle,
    currentIndex: room.currentIndex,
  };
}

export function roomsSize(): number {
  return rooms.size;
}

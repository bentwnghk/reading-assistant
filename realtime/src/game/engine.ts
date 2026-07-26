/**
 * Multiplayer spelling battle game engine.
 *
 * Drives a room through: lobby → countdown → playing → finished, emitting the
 * per-word events clients consume. The server is authoritative for word
 * cadence, judging, and scoring (Hybrid model — clients only report their
 * typed answer + hints used).
 *
 * Timers are tracked per-room in a module-level map so they can be cancelled
 * on host-cancel / room-destroy / shutdown (avoids emitting into a destroyed
 * room).
 */
import type { Server as SocketIOServer } from "socket.io";

import { BETWEEN_WORDS_MS, SUBMIT_GRACE_MS, WORD_DURATION_MS, judgeAnswer, scoreAnswer } from "./scoring";
import { toRoomStatePayload } from "../rooms";
import type {
  BattleGameMode,
  BattleRoom,
  CountdownPayload,
  GameEndPayload,
  LiveRankingPayload,
  PlayerProgressPayload,
  RankingEntry,
  WordEndPayload,
  WordEndResult,
  WordStartPayload,
  WordSubmitPayload,
} from "./types";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 1_000;

/**
 * Resolve the actual per-word game mode. For "mixed", each canonical word
 * carries its own `perWordMode` (assigned at resolve time); otherwise the
 * room's configured mode applies to every word.
 */
function actualMode(room: BattleRoom, index: number): BattleGameMode {
  const word = room.canonicalWords[index];
  if (!word) return room.config.gameMode;
  return room.config.gameMode === "mixed" ? word.perWordMode ?? room.config.gameMode : room.config.gameMode;
}

function broadcastRoomState(io: SocketIOServer, room: BattleRoom): void {
  io.to(room.code).emit("room:state", toRoomStatePayload(room));
}

// roomCode -> pending timers (countdown ticks, word timeouts, between-word pauses)
const timers = new Map<string, NodeJS.Timeout[]>();

function addTimer(code: string, t: NodeJS.Timeout): void {
  const arr = timers.get(code);
  if (arr) arr.push(t);
  else timers.set(code, [t]);
}

/** Cancel all pending timers for a room (call before destroy / cancel). */
export function clearTimers(code: string): void {
  const arr = timers.get(code);
  if (!arr) return;
  for (const t of arr) clearTimeout(t);
  timers.delete(code);
}

function buildRanking(room: BattleRoom): RankingEntry[] {
  const sorted = [...room.players.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.userId.localeCompare(b.userId);
  });
  let rank = 0;
  let prevScore = -1;
  let prevCorrect = -1;
  return sorted.map((p) => {
    if (p.score !== prevScore || p.correctCount !== prevCorrect) {
      rank += 1;
      prevScore = p.score;
      prevCorrect = p.correctCount;
    }
    return {
      rank,
      userId: p.userId,
      name: p.name,
      image: p.image,
      total: p.score,
      streak: p.streak,
      maxStreak: p.maxStreak,
      correctCount: p.correctCount,
      isHost: room.hostId === p.userId,
    };
  });
}

function emitLiveRanking(io: SocketIOServer, room: BattleRoom, index: number): void {
  const payload: LiveRankingPayload = { ranking: buildRanking(room), index };
  io.to(room.code).emit("live_ranking", payload);
}

function resetAccumulators(room: BattleRoom): void {
  for (const p of room.players.values()) {
    p.score = 0;
    p.streak = 0;
    p.maxStreak = 0;
    p.correctCount = 0;
    p.lastSubmittedIndex = -1;
    p.finished = false;
  }
  room.currentIndex = -1;
  room.wordStartedAt = 0;
}

// ── Public engine API ────────────────────────────────────────────────────────

/** Host starts the battle: lock the room + run the 3-2-1 countdown. */
export function startGame(io: SocketIOServer, room: BattleRoom): boolean {
  if (room.status !== "lobby") return false;
  const presentCount = [...room.players.values()].filter((p) => p.status === "present").length;
  if (presentCount < 2) return false;

  clearTimers(room.code);
  resetAccumulators(room);
  room.status = "countdown";
  room.wordResults.clear();
  room.wordSubmissions.clear();
  broadcastRoomState(io, room);

  let n = COUNTDOWN_FROM;
  io.to(room.code).emit("countdown", { n } satisfies CountdownPayload);
  const tick = (): void => {
    n -= 1;
    if (n > 0) {
      io.to(room.code).emit("countdown", { n } satisfies CountdownPayload);
      addTimer(room.code, setTimeout(tick, COUNTDOWN_STEP_MS));
    } else {
      startPlaying(io, room);
    }
  };
  addTimer(room.code, setTimeout(tick, COUNTDOWN_STEP_MS));
  return true;
}

function startPlaying(io: SocketIOServer, room: BattleRoom): void {
  room.status = "playing";
  startWord(io, room, 0);
}

function startWord(io: SocketIOServer, room: BattleRoom, index: number): void {
  if (index >= room.canonicalWords.length) {
    endGame(io, room);
    return;
  }
  room.currentIndex = index;
  room.wordStartedAt = Date.now();
  room.wordSubmissions.clear();
  room.wordResults.clear();

  const word = room.canonicalWords[index];
  const mode = actualMode(room, index);
  const durationMs = WORD_DURATION_MS[mode][room.config.difficulty];
  const payload: WordStartPayload = {
    index,
    total: room.canonicalWords.length,
    word: word.word,
    englishDefinition: word.englishDefinition,
    chineseDefinition: word.chineseDefinition,
    syllabification: word.syllabification,
    partOfSpeech: word.partOfSpeech,
    example: word.example,
    durationMs,
    startedAt: room.wordStartedAt,
    timed: room.config.timed,
    gameMode: mode,
    blankPositions: word.blankPositions,
    shuffledLetters: word.shuffledLetters,
  };
  broadcastRoomState(io, room);
  io.to(room.code).emit("word_start", payload);

  // Resolve the word when time is up (unless all submit early).
  const t = setTimeout(() => resolveWord(io, room, index), durationMs + SUBMIT_GRACE_MS);
  addTimer(room.code, t);
}

/** Process a player's submitted answer for the current word. */
export function submitAnswer(
  io: SocketIOServer,
  room: BattleRoom,
  userId: string,
  payload: WordSubmitPayload,
): void {
  if (room.status !== "playing") return;
  const player = room.players.get(userId);
  if (!player || player.status !== "present") return;
  if (payload.index !== room.currentIndex) return;
  if (player.lastSubmittedIndex === payload.index) return; // double-submit guard

  const word = room.canonicalWords[room.currentIndex];
  const mode = actualMode(room, room.currentIndex);
  const correct = judgeAnswer(mode, word.word, payload.answer, word.blankPositions);
  const durationMs = WORD_DURATION_MS[mode][room.config.difficulty];
  const result = scoreAnswer({
    correct,
    timed: room.config.timed,
    durationMs,
    // Server clock is authoritative — ignore the client's submittedAt for scoring.
    timeTakenMs: Date.now() - room.wordStartedAt,
    hintsUsed: payload.hintsUsed,
    oldStreak: player.streak,
  });

  player.lastSubmittedIndex = payload.index;
  player.score += result.points;
  player.streak = result.newStreak;
  player.maxStreak = Math.max(player.maxStreak, result.newStreak);
  if (result.correct) player.correctCount += 1;
  room.wordSubmissions.add(userId);
  room.wordResults.set(userId, { correct: result.correct, points: result.points });

  const progress: PlayerProgressPayload = {
    userId,
    index: payload.index,
    correct: result.correct,
    pointsAwarded: result.points,
    total: player.score,
    streak: player.streak,
  };
  io.to(room.code).emit("player_progress", progress);

  // If every present player has submitted, resolve the word immediately.
  const allSubmitted = [...room.players.values()]
    .filter((p) => p.status === "present")
    .every((p) => room.wordSubmissions.has(p.userId));
  if (allSubmitted) {
    resolveWord(io, room, payload.index);
  }
}

/** Resolve the current word: clear timer, mark non-submitters, broadcast results. */
function resolveWord(io: SocketIOServer, room: BattleRoom, index: number): void {
  if (index !== room.currentIndex || room.status !== "playing") return; // already resolved / not playing

  const word = room.canonicalWords[index];
  const results: WordEndResult[] = [];
  for (const p of room.players.values()) {
    const submitted = room.wordSubmissions.has(p.userId);
    if (!submitted && p.status === "present") {
      // Timed out / didn't answer — resets streak, no points.
      p.streak = 0;
      room.wordResults.set(p.userId, { correct: false, points: 0 });
    }
    const r = room.wordResults.get(p.userId) ?? { correct: false, points: 0 };
    results.push({
      userId: p.userId,
      correct: r.correct,
      pointsAwarded: r.points,
      total: p.score,
      streak: p.streak,
      submitted,
    });
  }

  const endPayload: WordEndPayload = { index, word: word.word, results };
  io.to(room.code).emit("word_end", endPayload);
  emitLiveRanking(io, room, index);

  // Pause for feedback, then advance.
  const nextIndex = index + 1;
  const t = setTimeout(() => {
    if (nextIndex >= room.canonicalWords.length) {
      endGame(io, room);
    } else {
      startWord(io, room, nextIndex);
    }
  }, BETWEEN_WORDS_MS);
  addTimer(room.code, t);
}

/** End the game: mark finished, broadcast final ranking. */
function endGame(io: SocketIOServer, room: BattleRoom): void {
  clearTimers(room.code);
  room.status = "finished";
  for (const p of room.players.values()) p.finished = true;
  broadcastRoomState(io, room);
  const payload: GameEndPayload = {
    finalRanking: buildRanking(room),
    totalWords: room.canonicalWords.length,
  };
  io.to(room.code).emit("game_end", payload);
}

/** Host requests a rematch: reset to lobby keeping players. */
export function rematch(io: SocketIOServer, room: BattleRoom): void {
  clearTimers(room.code);
  resetAccumulators(room);
  room.status = "lobby";
  room.wordResults.clear();
  room.wordSubmissions.clear();
  broadcastRoomState(io, room);
}

/** Cancel an in-progress game (host leave with no transfer, or room destroy). */
export function cancelGame(io: SocketIOServer, room: BattleRoom): void {
  clearTimers(room.code);
  if (room.status === "playing" || room.status === "countdown") {
    room.status = "lobby";
    resetAccumulators(room);
    broadcastRoomState(io, room);
  }
}

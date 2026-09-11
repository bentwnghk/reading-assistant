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

import { BETWEEN_WORDS_MS, SUBMIT_GRACE_MS, WORD_DURATION_MS, clampHintsUsed, judgeAnswer, scoreAnswer } from "./scoring";
import { toRoomStatePayload, countPresentPlayers } from "../rooms";
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

// roomCode -> pending timers (countdown ticks, between-word pauses)
const timers = new Map<string, NodeJS.Timeout[]>();

// roomCode -> the CURRENT word's deadline timer. Tracked separately from
// `timers` so it can be cancelled the moment the word resolves early (all
// players submitted): a deadline firing during the between-words pause used
// to re-resolve the already-resolved word and emit a duplicate word_end.
const wordDeadlines = new Map<string, NodeJS.Timeout>();

function addTimer(code: string, t: NodeJS.Timeout): void {
  const arr = timers.get(code);
  if (arr) arr.push(t);
  else timers.set(code, [t]);
}

function clearWordDeadline(code: string): void {
  const t = wordDeadlines.get(code);
  if (t) clearTimeout(t);
  wordDeadlines.delete(code);
}

/** Cancel all pending timers for a room (call before destroy / cancel). */
export function clearTimers(code: string): void {
  const arr = timers.get(code);
  if (!arr) {
    clearWordDeadline(code);
    return;
  }
  for (const t of arr) clearTimeout(t);
  timers.delete(code);
  clearWordDeadline(code);
}

function buildRanking(room: BattleRoom): RankingEntry[] {
  // Spectators never appear in rankings — they hold no score.
  const sorted = [...room.players.values()]
    .filter((p) => !p.spectator)
    .sort((a, b) => {
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
  room.resolvedIndex = -1;
}

// ── Public engine API ────────────────────────────────────────────────────────

/** Host starts the battle: lock the room + run the 3-2-1 countdown. */
export function startGame(io: SocketIOServer, room: BattleRoom): boolean {
  if (room.status !== "lobby") return false;
  // Spectators don't count — a host-spectator alone can't start a battle.
  if (countPresentPlayers(room) < 2) return false;

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
  // Duplicate-start guard: a word must only ever start once. `currentIndex`
  // stays at the resolved word during the between-words pause, so a stray
  // duplicate pause timer re-invoking startWord(next) lands here with
  // index === currentIndex (or lower) and must be dropped — otherwise it
  // would wipe wordSubmissions (lastSubmittedIndex blocks re-submission, so
  // already-submitted answers would be lost) and schedule a second deadline.
  if (index <= room.currentIndex) return;
  room.currentIndex = index;
  room.resolvedIndex = -1;
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

  // Resolve the word when time is up (unless all submit early — the deadline
  // is then cancelled inside resolveWord so it can never fire into the
  // between-words pause and re-resolve the sealed word).
  clearWordDeadline(room.code);
  const t = setTimeout(() => resolveWord(io, room, index), durationMs + SUBMIT_GRACE_MS);
  wordDeadlines.set(room.code, t);
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
  if (!player || player.status !== "present" || player.spectator) return;
  if (payload.index !== room.currentIndex) return;
  // The word is already resolved (deadline fired / all submitted) — it is
  // sealed. A late "buzzer-beater" submit racing the deadline must not be
  // scored or re-resolve the word: clients already received its word_end.
  if (room.resolvedIndex === payload.index) return;
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
    // Clamp hintsUsed to MAX_HINTS_PER_WORD so a buggy/malicious client cannot
    // self-report a low number after using more (the client also enforces the
    // cap in the UI, but the server is the source of truth).
    timeTakenMs: Date.now() - room.wordStartedAt,
    hintsUsed: clampHintsUsed(payload.hintsUsed),
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
  // Spectators never submit, so they must not hold the word open.
  const allSubmitted = [...room.players.values()]
    .filter((p) => p.status === "present" && !p.spectator)
    .every((p) => room.wordSubmissions.has(p.userId));
  if (allSubmitted) {
    resolveWord(io, room, payload.index);
  }
}

/** Resolve the current word: clear timer, mark non-submitters, broadcast results. */
function resolveWord(io: SocketIOServer, room: BattleRoom, index: number): void {
  if (index !== room.currentIndex || room.status !== "playing") return; // not the live word / not playing
  if (room.resolvedIndex === index) return; // already resolved — idempotency seal

  // Seal the word: cancel its pending deadline so it can never re-resolve the
  // word during the between-words pause, and mark it resolved so late submits
  // are rejected. currentIndex intentionally stays at `index` until the next
  // startWord advances it (clients + room state rely on it), which is exactly
  // why the seal must live in its own field.
  room.resolvedIndex = index;
  clearWordDeadline(room.code);

  const word = room.canonicalWords[index];
  const results: WordEndResult[] = [];
  for (const p of room.players.values()) {
    // Spectators are not scored and never appear in per-word results.
    if (p.spectator) continue;
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

  // Pause for feedback, then advance. The guard drops stale duplicate pause
  // timers (only the one that still matches the sealed word may advance the
  // game) — combined with startWord's duplicate-start guard this keeps the
  // loop single-threaded even if a resolution path ever races another.
  const nextIndex = index + 1;
  const t = setTimeout(() => {
    if (room.status !== "playing" || room.currentIndex !== index) return;
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

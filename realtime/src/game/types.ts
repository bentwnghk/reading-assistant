/**
 * Shared type definitions for the multiplayer spelling battle realtime server.
 *
 * These mirror the ambient types declared in the app's `src/types.d.ts`
 * so that client and server agree on the shape of data exchanged over
 * Socket.io. The realtime package is standalone (does not import from `src/`),
 * so types are re-declared here. Keep both sides in sync.
 */

export type UserRole = "super-admin" | "admin" | "teacher" | "student";

export type SpellingDifficulty = "easy" | "medium" | "hard";

/** A single word in a battle's word list. Definitions feed the hint system. */
export interface BattleWord {
  word: string;
  englishDefinition?: string;
  chineseDefinition?: string;
  syllabification?: string;
  partOfSpeech?: string;
  example?: string;
}

export type WordSourceType = "glossary" | "vocabulary" | "review-list" | "curated";

/** Filter applied when the word source is the host's vocabulary bank. */
export type VocabularyFilter = "all" | "due-for-review" | "hard-words";

export interface WordSource {
  type: WordSourceType;
  /** glossary: reading_session id; review-list: review_lists id; curated: CEFR level (A2/B1/B2/C1). */
  sourceId?: string;
  /** vocabulary bank only. */
  filter?: VocabularyFilter;
}

export interface BattleRoomConfig {
  source: WordSource;
  difficulty: SpellingDifficulty;
  /** Requested word count; server caps to the number actually available. */
  wordCount: number;
  timed: boolean;
  classBattle: boolean;
}

// ── Player / Room internal state ────────────────────────────────────────────

export interface RoomPlayer {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  socketId: string;
  status: "present" | "disconnected";
  disconnectedAt: number | null;
  // ── Per-game accumulators (populated in Phase 4) ──────────────────────────
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  /** Index of the last word this player submitted (to detect double-submits). */
  lastSubmittedIndex: number;
  finished: boolean;
}

export type RoomStatus = "lobby" | "countdown" | "playing" | "finished";

export interface BattleRoom {
  code: string;
  hostId: string;
  status: RoomStatus;
  config: BattleRoomConfig;
  players: Map<string, RoomPlayer>; // userId -> player
  createdAt: number;
  lastActivityAt: number;
  classBattle: boolean;
  /** Target class for class battles (null for normal rooms). */
  classId: string | null;
  /** Resolved (shuffled + capped) canonical word list — hidden from clients. */
  canonicalWords: BattleWord[];
  /** Resolved word count (may be < config.wordCount). */
  actualWordCount: number;
  // ── Game-loop state (populated in Phase 4) ────────────────────────────────
  currentIndex: number;
  wordStartedAt: number;
  /** userIds that have submitted for the current word. */
  wordSubmissions: Set<string>;
  /** Per-player result for the current word (correctness + points awarded). */
  wordResults: Map<string, { correct: boolean; points: number }>;
}

// ── Public room state (broadcast to clients — no canonical words) ───────────

export interface PlayerSummary {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  isHost: boolean;
  status: "present" | "disconnected";
  score: number;
  streak: number;
  correctCount: number;
  finished: boolean;
}

export interface RoomStatePayload {
  roomCode: string;
  status: RoomStatus;
  config: BattleRoomConfig;
  hostId: string;
  players: PlayerSummary[];
  actualWordCount: number;
  classBattle: boolean;
  currentIndex: number;
}

// ── Event payloads ──────────────────────────────────────────────────────────

// Client -> Server
export interface CreateRoomPayload {
  config: BattleRoomConfig;
  /** For class battles: the target class id (teacher must own it). */
  targetClassId?: string;
}

export interface JoinRoomPayload {
  code: string;
}

export interface SetSourcePayload {
  source: WordSource;
  wordCount: number;
}

// Server -> Client
export interface PlayerJoinedPayload {
  player: PlayerSummary;
}

export interface PlayerLeftPayload {
  userId: string;
  newHostId: string | null;
}

export interface ClassBattleAvailablePayload {
  roomCode: string;
  hostName: string | null;
  className: string | null;
  actualWordCount: number;
  difficulty: SpellingDifficulty;
}

export interface RoomErrorPayload {
  /** A stable error code the client can i18n-translate. */
  code: RoomErrorCode;
  message: string;
}

export type RoomErrorCode =
  | "room_not_found"
  | "room_full"
  | "room_not_in_lobby"
  | "already_in_room"
  | "not_host"
  | "too_many_rooms"
  | "invalid_source"
  | "not_connected"
  | "class_not_allowed"
  | "internal_error";

export interface KickedPayload {
  reason: "host_started" | "room_destroyed" | "replaced";
}

// ── Game-loop event payloads (Phase 4) ──────────────────────────────────────

export interface CountdownPayload {
  n: number;
}

export interface WordSubmitPayload {
  index: number;
  answer: string;
  /** Client timestamp — logged but NOT used for scoring (server clock is authoritative). */
  submittedAt: number;
  hintsUsed: number;
}

export interface WordStartPayload {
  index: number;
  total: number;
  word: string;
  englishDefinition?: string;
  chineseDefinition?: string;
  syllabification?: string;
  partOfSpeech?: string;
  example?: string;
  durationMs: number;
  startedAt: number;
  timed: boolean;
}

export interface PlayerProgressPayload {
  userId: string;
  index: number;
  correct: boolean;
  pointsAwarded: number;
  total: number;
  streak: number;
}

export interface WordEndResult {
  userId: string;
  correct: boolean;
  pointsAwarded: number;
  total: number;
  streak: number;
  /** false if the player timed out / didn't submit. */
  submitted: boolean;
}

export interface WordEndPayload {
  index: number;
  word: string;
  results: WordEndResult[];
}

export interface RankingEntry {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  total: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  isHost: boolean;
}

export interface LiveRankingPayload {
  ranking: RankingEntry[];
  index: number;
}

export interface GameEndPayload {
  finalRanking: RankingEntry[];
  totalWords: number;
}

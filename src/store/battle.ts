import { create } from "zustand"

import type { RealtimeConnectionStatus } from "@/lib/realtime-client"

/**
 * Multiplayer spelling battle client state.
 *
 * NON-PERSISTED: a battle is ephemeral and tied to a live Socket.io connection.
 * State lives at module scope (Zustand) so it survives SPA navigation — a user
 * can leave the spelling page mid-battle and return without losing connection
 * or live ranking (per AGENTS.md Lesson 8).
 *
 * `currentUserId` is set by the hook on mount so the store can resolve `isHost`
 * / "you" highlighting independently of which component is reading it.
 */
interface BattleStore {
  // ── Connection ───────────────────────────────────────────────────────────
  connectionStatus: RealtimeConnectionStatus
  hasInitiated: boolean
  error: string | null

  // ── Identity ─────────────────────────────────────────────────────────────
  currentUserId: string | null

  // ── Room (populated from server `room:state` payloads) ───────────────────
  roomCode: string | null
  status: BattleRoomStatus | null
  hostId: string | null
  players: BattlePlayerSummary[]
  config: BattleRoomConfig | null
  actualWordCount: number
  classBattle: boolean
  currentIndex: number
  /** Latest incoming class-battle invite (shown as a join prompt). */
  classInvite: BattleClassBattleAvailablePayload | null
  /** Pending class-battle invites discovered by the 60s poll (shown in the bell). */
  pendingClassBattleInvites: BattleClassBattleAvailablePayload[]
  /** Controls the class-battle-invite dialog opened from the header bell. */
  showClassBattleInviteDialog: boolean
  /** Flag set by ClassBattleInviteDialog to auto-navigate into battle mode. */
  shouldOpenBattle: boolean
  /**
   * Controls the unified battle-lobby dialog in the Header (Swords entry).
   * Driven by the Header button and by invite acceptance, so the lobby is
   * reachable on every page without navigating to `/`.
   */
  showBattleLobbyDialog: boolean
  /**
   * A join requested before the socket connected (e.g. clicking the invite
   * banner's Join during the handshake). Drained by the `connect` handler once
   * the socket is live, so join is robust to connection timing.
   */
  pendingJoinCode: string | null

  // ── Game loop (populated from countdown/word_start/word_end/etc.) ────────
  countdownN: number | null
  currentWord: BattleWordStartPayload | null
  /** The current word has ended (server `word_end`) — reveal the correct answer. */
  wordEnded: { index: number; correctWord: string } | null
  /** My latest per-word result (for immediate local feedback). */
  myLastResult: { index: number; correct: boolean; pointsAwarded: number; total: number; streak: number } | null
  /** Accumulated per-word results for SRS + review-session persistence. */
  myWordResults: { word: string; correct: boolean }[]
  liveRanking: BattleRankingEntry[]
  finalRanking: BattleRankingEntry[]
  totalWords: number
  /** True after the results have been persisted (activity log, store, etc.). */
  resultPersisted: boolean
  /**
   * True when this battle's final score beat the player's previous
   * `spellingGameBestScore` (computed in SpellingBattleFlow's persist effect
   * BEFORE the best-score update, since the reading store only keeps a max).
   * Drives the "New personal best!" celebration on the results screen.
   */
  newBestAchieved: boolean
  /**
   * Per-word SRS outcomes collected from the page-supplied onWordResult
   * promises during result persistence — powers the results screen's
   * "spaced repetition updated" card. Empty when the entry point supplied a
   * fire-and-forget (or no) onWordResult.
   */
  srsOutcomes: VocabularySrsOutcome[]

  // ── Actions ──────────────────────────────────────────────────────────────
  setConnectionStatus: (status: RealtimeConnectionStatus) => void
  setHasInitiated: (value: boolean) => void
  setError: (error: string | null) => void
  setCurrentUserId: (userId: string | null) => void
  setRoomState: (state: BattleRoomState) => void
  setClassInvite: (invite: BattleClassBattleAvailablePayload | null) => void
  setPendingClassBattleInvites: (invites: BattleClassBattleAvailablePayload[]) => void
  dismissClassBattleInvite: (roomCode: string) => void
  setShowClassBattleInviteDialog: (open: boolean) => void
  setShouldOpenBattle: (open: boolean) => void
  setShowBattleLobbyDialog: (open: boolean) => void
  setPendingJoinCode: (code: string | null) => void
  setCountdown: (n: number | null) => void
  setCurrentWord: (word: BattleWordStartPayload | null) => void
  setWordEnded: (info: { index: number; correctWord: string } | null) => void
  setMyLastResult: (result: BattleStore["myLastResult"]) => void
  pushWordResult: (word: string, correct: boolean) => void
  setLiveRanking: (ranking: BattleRankingEntry[]) => void
  setGameEnd: (finalRanking: BattleRankingEntry[], totalWords: number) => void
  setResultPersisted: (value: boolean) => void
  setNewBestAchieved: (value: boolean) => void
  setSrsOutcomes: (outcomes: VocabularySrsOutcome[]) => void
  reset: () => void
}

const initialRoomState = {
  currentUserId: null,
  roomCode: null,
  status: null,
  hostId: null,
  players: [],
  config: null,
  actualWordCount: 0,
  classBattle: false,
  currentIndex: -1,
  classInvite: null,
  pendingClassBattleInvites: [],
  showClassBattleInviteDialog: false,
  shouldOpenBattle: false,
  showBattleLobbyDialog: false,
  pendingJoinCode: null,
  countdownN: null,
  currentWord: null,
  wordEnded: null,
  myLastResult: null,
  myWordResults: [],
  liveRanking: [],
  finalRanking: [],
  totalWords: 0,
  resultPersisted: false,
  newBestAchieved: false,
  srsOutcomes: [],
}

export const useBattleStore = create<BattleStore>((set) => ({
  connectionStatus: "idle",
  hasInitiated: false,
  error: null,
  ...initialRoomState,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setHasInitiated: (hasInitiated) => set({ hasInitiated }),
  setError: (error) => set({ error }),
  setCurrentUserId: (currentUserId) => set({ currentUserId }),

  setRoomState: (state) =>
    set({
      roomCode: state.roomCode,
      status: state.status,
      hostId: state.hostId,
      players: state.players,
      config: state.config,
      actualWordCount: state.actualWordCount,
      classBattle: state.classBattle,
      currentIndex: state.currentIndex,
      // Clear live game fields when the room is back in the lobby (rematch)
      // or finished — the next word_start/game_end repopulates them.
      ...(state.status === "lobby"
        ? { countdownN: null, currentWord: null, wordEnded: null, myLastResult: null, liveRanking: [], finalRanking: [], myWordResults: [], resultPersisted: false, newBestAchieved: false, srsOutcomes: [] }
        : state.status === "countdown"
          ? { finalRanking: [], myWordResults: [], currentWord: null, wordEnded: null, resultPersisted: false, newBestAchieved: false, srsOutcomes: [] } // fresh game
          : {}),
    }),

  setClassInvite: (classInvite) => set({ classInvite }),

  setPendingClassBattleInvites: (pendingClassBattleInvites) => set({ pendingClassBattleInvites }),
  dismissClassBattleInvite: (roomCode) =>
    set((state) => ({
      pendingClassBattleInvites: state.pendingClassBattleInvites.filter((i) => i.roomCode !== roomCode),
    })),
  setShowClassBattleInviteDialog: (showClassBattleInviteDialog) => set({ showClassBattleInviteDialog }),
  setShouldOpenBattle: (shouldOpenBattle: boolean) => set({ shouldOpenBattle }),
  setShowBattleLobbyDialog: (showBattleLobbyDialog: boolean) => set({ showBattleLobbyDialog }),
  setPendingJoinCode: (pendingJoinCode: string | null) => set({ pendingJoinCode }),

  setCountdown: (countdownN) => set({ countdownN }),
  setCurrentWord: (currentWord) => set({ currentWord, wordEnded: null }),
  setWordEnded: (wordEnded) => set({ wordEnded }),
  setMyLastResult: (myLastResult) => set({ myLastResult }),
  pushWordResult: (word, correct) =>
    set((state) => ({ myWordResults: [...state.myWordResults, { word, correct }] })),
  setLiveRanking: (liveRanking) => set({ liveRanking }),
  setGameEnd: (finalRanking, totalWords) => set({ finalRanking, totalWords, currentWord: null, wordEnded: null, countdownN: null }),

  setResultPersisted: (resultPersisted) => set({ resultPersisted }),

  setNewBestAchieved: (newBestAchieved) => set({ newBestAchieved }),

  setSrsOutcomes: (srsOutcomes) => set({ srsOutcomes }),

  reset: () =>
    set({
      connectionStatus: "idle",
      hasInitiated: false,
      error: null,
      ...initialRoomState,
    }),
}))

/** Convenience selector: is the current user the host? */
export function selectIsHost(state: BattleStore): boolean {
  return state.currentUserId !== null && state.hostId === state.currentUserId
}

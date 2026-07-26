"use client"

import { useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"

import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeSocket,
  type RealtimeConnectionStatus,
} from "@/lib/realtime-client"
import { useBattleStore } from "@/store/battle"

/**
 * React hook wrapping the singleton Socket.io connection for multiplayer
 * spelling battles.
 *
 * Connection is imperative: the battle lobby calls `connect()` when the user
 * opts into multiplayer, and `disconnect()` when they exit the battle flow.
 * The underlying socket + Zustand store live at module scope, so the
 * connection and live ranking survive SPA navigation.
 *
 * Server→store event wiring happens once (module-level guard) after the first
 * successful connect; subsequent reconnects fire the socket "connect" event,
 * which re-joins the current room (if any) to restore the player's seat.
 */
let eventsWired = false

function wireEventsOnce(socket: NonNullable<ReturnType<typeof getRealtimeSocket>>): void {
  if (eventsWired) return
  eventsWired = true

  // Full room state — the source of truth for the lobby/arena UI.
  socket.on("room:state", (state: BattleRoomState) => {
    useBattleStore.getState().setRoomState(state)
  })

  // Another player joined/left — the subsequent room:state carries the updated
  // list, so we only act when the CURRENT user was removed (kicked/host-left).
  socket.on("player_left", (msg: BattlePlayerLeftPayload) => {
    const me = useBattleStore.getState().currentUserId
    if (me && msg.userId === me) {
      // I was removed from the room — clear local room fields (keep connection).
      useBattleStore.getState().setRoomState(emptyRoomState())
    }
  })

  socket.on("room:error", (err: BattleRoomErrorPayload) => {
    useBattleStore.getState().setError(err.code)
  })

  socket.on("class_battle_available", (notif: BattleClassBattleAvailablePayload) => {
    useBattleStore.getState().setError(null)
    useBattleStore.getState().setClassInvite(notif)
  })

  // ── Game-loop events ──────────────────────────────────────────────────────
  socket.on("countdown", (payload: BattleCountdownPayload) => {
    useBattleStore.getState().setCountdown(payload.n)
  })

  socket.on("word_start", (payload: BattleWordStartPayload) => {
    useBattleStore.getState().setCurrentWord(payload)
    useBattleStore.getState().setMyLastResult(null)
  })

  socket.on("player_progress", (payload: BattlePlayerProgressPayload) => {
    const me = useBattleStore.getState().currentUserId
    if (me && payload.userId === me) {
      useBattleStore.getState().setMyLastResult({
        index: payload.index,
        correct: payload.correct,
        pointsAwarded: payload.pointsAwarded,
        total: payload.total,
        streak: payload.streak,
      })
    }
  })

  socket.on("word_end", (payload: BattleWordEndPayload) => {
    // Accumulate MY per-word result for SRS + review-session persistence.
    const me = useBattleStore.getState().currentUserId
    if (me) {
      const myResult = payload.results.find((r) => r.userId === me)
      if (myResult) {
        useBattleStore.getState().pushWordResult(payload.word, myResult.correct)
      }
    }
  })

  socket.on("live_ranking", (payload: BattleLiveRankingPayload) => {
    useBattleStore.getState().setLiveRanking(payload.ranking)
  })

  socket.on("game_end", (payload: BattleGameEndPayload) => {
    useBattleStore.getState().setGameEnd(payload.finalRanking, payload.totalWords)
  })

  // On every (re)connect, re-join the current room to restore the seat.
  socket.on("connect", () => {
    const { roomCode } = useBattleStore.getState()
    if (roomCode) {
      socket.emit("room:join", { code: roomCode } satisfies BattleJoinRoomPayload)
    }
  })
}

function emptyRoomState(): BattleRoomState {
  return {
    roomCode: "",
    status: "lobby",
    config: {
      source: { type: "vocabulary" },
      difficulty: "easy",
      gameMode: "listen-type",
      wordCount: 0,
      timed: false,
      classBattle: false,
    } as BattleRoomConfig,
    hostId: "",
    players: [],
    actualWordCount: 0,
    classBattle: false,
    currentIndex: -1,
  }
}

export interface UseSpellingBattle {
  // connection state
  connectionStatus: RealtimeConnectionStatus
  hasInitiated: boolean
  error: string | null
  isConnecting: boolean
  isConnected: boolean
  isUnavailable: boolean
  // room state
  roomCode: string | null
  status: BattleRoomStatus | null
  hostId: string | null
  players: BattlePlayerSummary[]
  actualWordCount: number
  isHost: boolean
  // game-loop state
  countdownN: number | null
  currentWord: BattleWordStartPayload | null
  myLastResult: { index: number; correct: boolean; pointsAwarded: number; total: number; streak: number } | null
  myWordResults: { word: string; correct: boolean }[]
  liveRanking: BattleRankingEntry[]
  finalRanking: BattleRankingEntry[]
  totalWords: number
  config: BattleRoomConfig | null
  // imperative API
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
  createRoom: (payload: BattleCreateRoomPayload) => void
  joinRoom: (code: string) => void
  leaveRoom: () => void
  setSource: (source: WordSource, wordCount: number) => void
  startGame: () => void
  submitAnswer: (payload: { index: number; answer: string; submittedAt: number; hintsUsed: number }) => void
  requestRematch: () => void
}

export function useSpellingBattle(): UseSpellingBattle {
  const { data: session } = useSession()
  const connectionStatus = useBattleStore((s) => s.connectionStatus)
  const hasInitiated = useBattleStore((s) => s.hasInitiated)
  const error = useBattleStore((s) => s.error)
  const roomCode = useBattleStore((s) => s.roomCode)
  const status = useBattleStore((s) => s.status)
  const hostId = useBattleStore((s) => s.hostId)
  const players = useBattleStore((s) => s.players)
  const actualWordCount = useBattleStore((s) => s.actualWordCount)

  // Track the current user id so the store can resolve host/"you" highlighting.
  useEffect(() => {
    useBattleStore.getState().setCurrentUserId(session?.user?.id ?? null)
  }, [session?.user?.id])

  // Surface connect failures; clear errors once connected.
  useEffect(() => {
    if (connectionStatus === "unavailable") {
      useBattleStore.getState().setError("multiplayer_unavailable")
    } else if (connectionStatus === "connected") {
      // Don't clobber a room:error; only clear connection-level errors.
      const current = useBattleStore.getState().error
      if (current === "connection_failed" || current === "multiplayer_unavailable") {
        useBattleStore.getState().setError(null)
      }
    }
  }, [connectionStatus])

  const connect = useCallback(async (): Promise<void> => {
    useBattleStore.getState().setHasInitiated(true)
    const onStatus = (status: RealtimeConnectionStatus) => {
      useBattleStore.getState().setConnectionStatus(status)
    }
    try {
      await connectRealtime(onStatus)
      const socket = getRealtimeSocket()
      if (socket) wireEventsOnce(socket)
    } catch {
      useBattleStore.getState().setConnectionStatus("error")
      useBattleStore.getState().setError("connection_failed")
    }
  }, [])

  const disconnect = useCallback((): void => {
    disconnectRealtime()
    useBattleStore.getState().reset()
  }, [])

  const clearError = useCallback(() => {
    useBattleStore.getState().setError(null)
  }, [])

  const createRoom = useCallback((payload: BattleCreateRoomPayload): void => {
    const socket = getRealtimeSocket()
    if (!socket?.connected) {
      useBattleStore.getState().setError("not_connected")
      return
    }
    socket.emit("room:create", payload)
  }, [])

  const joinRoom = useCallback((code: string): void => {
    const socket = getRealtimeSocket()
    if (!socket?.connected) {
      useBattleStore.getState().setError("not_connected")
      return
    }
    socket.emit("room:join", { code: code.trim().toUpperCase() } satisfies BattleJoinRoomPayload)
  }, [])

  const leaveRoom = useCallback((): void => {
    const socket = getRealtimeSocket()
    if (socket?.connected) socket.emit("room:leave")
    useBattleStore.getState().setRoomState(emptyRoomState())
  }, [])

  const setSource = useCallback((source: WordSource, wordCount: number): void => {
    const socket = getRealtimeSocket()
    if (!socket?.connected) {
      useBattleStore.getState().setError("not_connected")
      return
    }
    socket.emit("room:set_source", { source, wordCount } satisfies BattleSetSourcePayload)
  }, [])

  const startGame = useCallback((): void => {
    const socket = getRealtimeSocket()
    if (!socket?.connected) return
    // Phase 4 wires the server-side game loop.
    socket.emit("room:start")
  }, [])

  const submitAnswer = useCallback(
    (payload: { index: number; answer: string; submittedAt: number; hintsUsed: number }): void => {
      const socket = getRealtimeSocket()
      if (!socket?.connected) return
      socket.emit("word:submit", payload)
    },
    [],
  )

  const requestRematch = useCallback((): void => {
    const socket = getRealtimeSocket()
    if (!socket?.connected) return
    socket.emit("room:rematch")
  }, [])

  const currentUserId = session?.user?.id ?? null
  const isHost = currentUserId !== null && hostId === currentUserId

  // Game-loop state (read from the store; updated by server events wired above).
  const countdownN = useBattleStore((s) => s.countdownN)
  const currentWord = useBattleStore((s) => s.currentWord)
  const myLastResult = useBattleStore((s) => s.myLastResult)
  const myWordResults = useBattleStore((s) => s.myWordResults)
  const liveRanking = useBattleStore((s) => s.liveRanking)
  const finalRanking = useBattleStore((s) => s.finalRanking)
  const totalWords = useBattleStore((s) => s.totalWords)
  const config = useBattleStore((s) => s.config)

  return {
    connectionStatus,
    hasInitiated,
    error,
    isConnecting: connectionStatus === "connecting",
    isConnected: connectionStatus === "connected",
    isUnavailable: connectionStatus === "unavailable",
    roomCode,
    status,
    hostId,
    players,
    actualWordCount,
    isHost,
    countdownN,
    currentWord,
    myLastResult,
    myWordResults,
    liveRanking,
    finalRanking,
    totalWords,
    config,
    connect,
    disconnect,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    setSource,
    startGame,
    submitAnswer,
    requestRematch,
  }
}

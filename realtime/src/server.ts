/**
 * Realtime server bootstrap + room/lobby/game orchestration.
 *
 * Socket.io server with HMAC-ticket auth, presence tracking, room
 * create/join/leave, word-source resolution, host transfer, class-battle
 * broadcast, disconnect grace, idle-room pruning, and the full game loop
 * (countdown / per-word timing / scoring / live ranking / game_end).
 */
import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";

import { config } from "./config";
import { verifyTicket, type AuthenticatedUser } from "./auth";
import { getPool, resolveClassId, canTargetClass, isClassMember, getClassInfo, closePool } from "./db";
import {
  registerPresence,
  unregisterPresenceBySocket,
  getConnectedSocketIdsInClass,
} from "./presence";
import {
  addPlayer,
  countActiveRoomsByHost,
  createRoom,
  destroyRoom,
  findClassBattleInvites,
  findRoomByPlayer,
  getRoom,
  markDisconnected,
  pruneIdleRooms,
  removePlayer,
  setRoomSource,
  toRoomStatePayload,
} from "./rooms";
import { resolveWordList } from "./game/words";
import { startGame, submitAnswer, rematch, cancelGame, clearTimers } from "./game/engine";
import type {
  BattleRoom,
  CreateRoomPayload,
  JoinRoomPayload,
  RoomErrorCode,
  RoomErrorPayload,
  SetSourcePayload,
  ClassBattleAvailablePayload,
  WordSubmitPayload,
} from "./game/types";

interface ServerSocketData {
  user: AuthenticatedUser;
}

// Disconnect-grace timers: userId -> timeout that removes the player after grace.
const graceTimers = new Map<string, NodeJS.Timeout>();

function healthcheck(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "reading-assistant-realtime",
      uptime: process.uptime(),
      ts: Date.now(),
    }),
  );
}

function handlePendingClassInvites(req: IncomingMessage, res: ServerResponse): void {
  try {
    const parsedUrl = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    const ticket = parsedUrl.searchParams.get("ticket") ?? undefined;
    const user = verifyTicket(ticket);
    if (!user || !user.classId) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ invites: [] }));
      return;
    }
    const invites = findClassBattleInvites(user.classId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ invites }));
  } catch {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ invites: [] }));
  }
}

/**
 * Set CORS headers on raw HTTP responses. The Socket.io server has its own
 * CORS config (applied to Engine.IO endpoints only), but the raw HTTP routes
 * (/health, /api/battle/pending-class-invites) need their own headers for
 * browser fetch() calls to succeed cross-origin.
 */
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && config.corsOrigin.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
}

const httpServer: HttpServer = createServer((req, res) => {
  setCorsHeaders(req, res);
  // Handle CORS preflight.
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/health") return healthcheck(req, res);
  // Internal endpoint: returns class-battle invites for the ticket-holder's class.
  // Used by the app's 60s Header poll so students see invites anywhere in the app.
  if (req.method === "GET" && req.url?.startsWith("/api/battle/pending-class-invites")) {
    return handlePendingClassInvites(req, res);
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

const io = new SocketIOServer(httpServer, {
  cors: { origin: config.corsOrigin, credentials: true },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function emitRoomError(socket: Socket, code: RoomErrorCode, message: string): void {
  const payload: RoomErrorPayload = { code, message };
  socket.emit("room:error", payload);
}

function broadcastRoomState(room: BattleRoom): void {
  io.to(room.code).emit("room:state", toRoomStatePayload(room));
}

function clearGraceTimer(userId: string): void {
  const t = graceTimers.get(userId);
  if (t) {
    clearTimeout(t);
    graceTimers.delete(userId);
  }
}

/** Remove a player from whatever room they're in, transfer host, broadcast. */
function leaveCurrentRoom(userId: string): BattleRoom | null {
  const room = findRoomByPlayer(userId);
  if (!room) return null;
  const result = removePlayer(room, userId);
  // Notify the leaving socket's former roommates.
  if (result.removed) {
    io.to(room.code).emit("player_left", { userId, newHostId: result.newHostId });
    if (result.empty) {
      clearTimers(room.code);
      destroyRoom(room.code);
    } else {
      broadcastRoomState(room);
    }
  }
  return result.empty ? null : room;
}

/** Schedule removal of a disconnected player after the grace window. */
function scheduleGraceRemoval(userId: string): void {
  clearGraceTimer(userId);
  const timer = setTimeout(() => {
    graceTimers.delete(userId);
    const room = findRoomByPlayer(userId);
    if (!room) return;
    const player = room.players.get(userId);
    if (!player || player.status !== "disconnected") return; // reconnected
    removePlayer(room, userId);
    io.to(room.code).emit("player_left", { userId, newHostId: room.hostId });
    if (room.players.size === 0) {
      clearTimers(room.code);
      destroyRoom(room.code);
    } else {
      broadcastRoomState(room);
    }
  }, config.reconnectGraceMs);
  graceTimers.set(userId, timer);
}

// ── Auth middleware ──────────────────────────────────────────────────────────

io.use((socket: Socket, next) => {
  const handshakeAuth = socket.handshake.auth as { token?: unknown };
  const user = verifyTicket(typeof handshakeAuth.token === "string" ? handshakeAuth.token : undefined);
  if (!user) {
    return next(new Error("unauthorized"));
  }
  (socket.data as ServerSocketData) = { user };
  next();
});

// ── Connection lifecycle ────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  const { user } = (socket.data as ServerSocketData);
  console.log(`[realtime] connect   user=${user.userId} name=${user.name ?? "-"} role=${user.role} socket=${socket.id}`);

  // Register presence with the ticket's classId (if available).
  registerPresence({
    userId: user.userId,
    socketId: socket.id,
    name: user.name,
    image: user.image,
    role: user.role,
    schoolId: user.schoolId,
    classId: user.classId ?? null,
  });
  // Fallback: resolve classId from DB if the ticket didn't carry it
  // (older clients during rollout).
  if (!user.classId) {
    resolveClassId(user.userId)
      .then((classId) => {
        if (!classId) return;
        registerPresence({
          userId: user.userId,
          socketId: socket.id,
          name: user.name,
          image: user.image,
          role: user.role,
          schoolId: user.schoolId,
          classId,
        });
      })
      .catch(() => {});
  }

  // ── room:create ──────────────────────────────────────────────────────────
  socket.on("room:create", async (raw: unknown) => {
    const payload = raw as CreateRoomPayload;
    try {
      if (!payload?.config || typeof payload.config.wordCount !== "number") {
        return emitRoomError(socket, "invalid_source", "Invalid room config");
      }
      // A user may host at most N active rooms.
      if (countActiveRoomsByHost(user.userId) >= config.maxRoomsPerHost) {
        return emitRoomError(socket, "too_many_rooms", "Too many active rooms");
      }
      // Leave any room the user is currently in.
      leaveCurrentRoom(user.userId);

      // Class-battle RBAC: teacher must own the target class.
      let classId: string | null = null;
      if (payload.config.classBattle) {
        if (!payload.targetClassId) {
          return emitRoomError(socket, "class_not_allowed", "Class battle requires a target class");
        }
        const allowed = await canTargetClass(user.userId, user.role, user.schoolId, payload.targetClassId);
        if (!allowed) {
          return emitRoomError(socket, "class_not_allowed", "You may not target this class");
        }
        classId = payload.targetClassId;
      }

      // Resolve the word list (fetch + shuffle + cap).
      let resolved;
      try {
        resolved = await resolveWordList(user.userId, payload.config.source, payload.config.wordCount);
      } catch (e) {
        return emitRoomError(socket, "invalid_source", e instanceof Error ? e.message : "Invalid word source");
      }
      if (resolved.actualCount === 0) {
        return emitRoomError(socket, "invalid_source", "Word source is empty");
      }

      const room = createRoom({
        host: user,
        config: payload.config,
        socketId: socket.id,
        resolved,
        classId,
      });
      socket.join(room.code);
      // The host's player socketId is set at creation; ensure it matches.
      const hostPlayer = room.players.get(user.userId);
      if (hostPlayer) hostPlayer.socketId = socket.id;

      console.log(`[realtime] room:create code=${room.code} host=${user.userId} words=${resolved.actualCount}`);
      broadcastRoomState(room);

      // Class-battle broadcast to connected classmates.
      if (room.classBattle && classId) {
        const info = await getClassInfo(classId);
        const classmateSocketIds = getConnectedSocketIdsInClass(classId);
        const notif: ClassBattleAvailablePayload = {
          roomCode: room.code,
          hostName: info.ownerName ?? user.name,
          className: info.className,
          actualWordCount: room.actualWordCount,
          difficulty: payload.config.difficulty,
        };
        for (const sid of classmateSocketIds) {
          if (sid !== socket.id) io.to(sid).emit("class_battle_available", notif);
        }
      }
    } catch (e) {
      console.error("[realtime] room:create error", e);
      emitRoomError(socket, "internal_error", "Failed to create room");
    }
  });

  // ── room:join ────────────────────────────────────────────────────────────
  socket.on("room:join", async (raw: unknown) => {
    const payload = raw as JoinRoomPayload;
    try {
      if (!payload?.code || typeof payload.code !== "string") {
        return emitRoomError(socket, "room_not_found", "Room code required");
      }
      const room = getRoom(payload.code);
      if (!room) {
        return emitRoomError(socket, "room_not_found", "No room with that code");
      }
      // A NEW joiner may only join during lobby; a reconnecting member (already
      // in the room, possibly marked disconnected) may rebind their seat at any
      // game phase so a dropped connection mid-battle is recoverable.
      const existingMember = room.players.get(user.userId);
      if (!existingMember && room.status !== "lobby") {
        return emitRoomError(socket, "room_not_in_lobby", "That battle has already started");
      }
      // If currently in ANOTHER room, leave its Socket.io room + data first.
      const otherRoom = findRoomByPlayer(user.userId);
      if (otherRoom && otherRoom.code !== room.code) {
        socket.leave(otherRoom.code);
        leaveCurrentRoom(user.userId);
      }
      const isReconnect = !!existingMember;
      // Class-battle membership: a new joiner must belong to the target class
      // (student via class_members) or be a teacher/admin who can target it.
      if (!isReconnect && room.classBattle && room.classId) {
        const isClassMember_ = await isClassMember(user.userId, room.classId);
        const canTarget = user.role === "teacher" || user.role === "admin" || user.role === "super-admin"
          ? await canTargetClass(user.userId, user.role, user.schoolId, room.classId).catch(() => false)
          : false;
        if (!isClassMember_ && !canTarget) {
          return emitRoomError(socket, "class_not_allowed", "You are not a member of the target class");
        }
      }
      const player = addPlayer(room, user, socket.id);
      if (!player) {
        return emitRoomError(socket, "room_full", "That room is full");
      }
      socket.join(room.code);
      clearGraceTimer(user.userId); // reconnect within grace
      console.log(`[realtime] room:join   code=${room.code} user=${user.userId} reconnect=${isReconnect} players=${room.players.size}`);
      if (isReconnect) {
        // Seat restored (status -> present); no player_joined, just fresh state.
        broadcastRoomState(room);
      } else {
        // Notify roommates of the new player.
        io.to(room.code).emit("player_joined", {
          player: {
            userId: player.userId,
            name: player.name,
            image: player.image,
            role: player.role,
            isHost: room.hostId === player.userId,
            status: player.status,
            score: player.score,
            streak: player.streak,
            correctCount: player.correctCount,
            finished: player.finished,
          },
        });
        broadcastRoomState(room);
      }
    } catch (e) {
      console.error("[realtime] room:join error", e);
      emitRoomError(socket, "internal_error", "Failed to join room");
    }
  });

  // ── room:set_source (host re-picks word source before start) ─────────────
  socket.on("room:set_source", async (raw: unknown) => {
    const payload = raw as SetSourcePayload;
    try {
      const room = findRoomByPlayer(user.userId);
      if (!room) return emitRoomError(socket, "not_connected", "You are not in a room");
      if (room.hostId !== user.userId) return emitRoomError(socket, "not_host", "Only the host can change the word source");
      if (room.status !== "lobby") return emitRoomError(socket, "room_not_in_lobby", "Battle already started");
      if (!payload?.source) return emitRoomError(socket, "invalid_source", "Source required");
      let resolved;
      try {
        resolved = await resolveWordList(user.userId, payload.source, payload.wordCount);
      } catch (e) {
        return emitRoomError(socket, "invalid_source", e instanceof Error ? e.message : "Invalid word source");
      }
      setRoomSource(room, payload.source, resolved);
      console.log(`[realtime] room:set_source code=${room.code} words=${resolved.actualCount}`);
      broadcastRoomState(room);
    } catch (e) {
      console.error("[realtime] room:set_source error", e);
      emitRoomError(socket, "internal_error", "Failed to update word source");
    }
  });

  // ── room:leave ───────────────────────────────────────────────────────────
  socket.on("room:leave", () => {
    const room = leaveCurrentRoom(user.userId);
    if (room) socket.leave(room.code);
    clearGraceTimer(user.userId);
  });

  // ── room:start (host only — kicks off the countdown + game loop) ─────────
  socket.on("room:start", () => {
    const room = findRoomByPlayer(user.userId);
    if (!room) return emitRoomError(socket, "not_connected", "You are not in a room");
    if (room.hostId !== user.userId) return emitRoomError(socket, "not_host", "Only the host can start the battle");
    const started = startGame(io, room);
    if (!started) {
      return emitRoomError(socket, "room_not_in_lobby", "Need at least 2 present players to start");
    }
    console.log(`[realtime] room:start  code=${room.code} host=${user.userId}`);
  });

  // ── word:submit ──────────────────────────────────────────────────────────
  socket.on("word:submit", (raw: unknown) => {
    const payload = raw as WordSubmitPayload;
    if (!payload || typeof payload.answer !== "string" || typeof payload.index !== "number") return;
    const room = findRoomByPlayer(user.userId);
    if (!room) return;
    submitAnswer(io, room, user.userId, payload);
  });

  // ── room:rematch (host only — reset to lobby) ────────────────────────────
  socket.on("room:rematch", () => {
    const room = findRoomByPlayer(user.userId);
    if (!room) return;
    if (room.hostId !== user.userId) return emitRoomError(socket, "not_host", "Only the host can start a rematch");
    rematch(io, room);
    console.log(`[realtime] room:rematch code=${room.code}`);
  });

  socket.on("error", (err: Error) => {
    console.error(`[realtime] socket error user=${user.userId}:`, err.message);
  });

  socket.on("disconnect", (reason: string) => {
    console.log(`[realtime] disconnect user=${user.userId} reason=${reason} socket=${socket.id}`);
    // Only unregister presence if this socket is still the user's current one
    // (a newer connection may have replaced it).
    unregisterPresenceBySocket(socket.id);

    const room = findRoomByPlayer(user.userId);
    if (room) {
      markDisconnected(room, user.userId, Date.now());
      // If an in-progress game drops below 2 present players, abort to lobby.
      const presentCount = [...room.players.values()].filter((p) => p.status === "present").length;
      if (presentCount < 2 && (room.status === "playing" || room.status === "countdown")) {
        cancelGame(io, room);
      } else {
        broadcastRoomState(room);
      }
      scheduleGraceRemoval(user.userId);
    }
  });

  // (room:start / word:submit / room:rematch handlers are registered above.)
});

// ── Idle-room pruning ────────────────────────────────────────────────────────

const pruneInterval = setInterval(() => {
  const destroyed = pruneIdleRooms();
  if (destroyed.length > 0) {
    console.log(`[realtime] pruned ${destroyed.length} idle room(s)`);
  }
}, 60_000);
pruneInterval.unref();

// ── Bootstrap + shutdown ─────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`[realtime] Socket.io server listening on :${config.port} (cors=${config.corsOrigin.join(",")})`);
  // Touch the pool lazily; only log if DATABASE_URL is configured.
  if (config.databaseUrl) {
    getPool()
      .query("SELECT 1")
      .then(() => console.log("[realtime] database connected"))
      .catch((e) => console.warn("[realtime] database not reachable (word sources will fail):", e.message));
  } else {
    console.warn("[realtime] DATABASE_URL not set — only curated word sources will work");
  }
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[realtime] ${signal} received, shutting down`);
  clearInterval(pruneInterval);
  io.close(() => {
    httpServer.close(() => {
      closePool()
        .catch(() => {})
        .finally(() => {
          console.log("[realtime] closed");
          process.exit(0);
        });
    });
  });
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err: Error) => {
  console.error("[realtime] uncaughtException:", err);
});
process.on("unhandledRejection", (reason: unknown) => {
  console.error("[realtime] unhandledRejection:", reason);
});

/**
 * Singleton Socket.io client for multiplayer spelling battles.
 *
 * Design (per AGENTS.md Lesson 8): the connection lives at module scope so it
 * survives SPA navigation — a user can leave the spelling page mid-battle and
 * return without dropping the socket. Components/hooks read connection state
 * from the `battle` store, never holding the socket in component-local state.
 *
 * Auth: on every (re)connect, socket.io calls the `auth` function below which
 * fetches a fresh short-lived ticket from `/api/realtime/ticket`. The ticket
 * is passed as `auth.token` and verified by the realtime server (see
 * `realtime/src/auth.ts`). Tickets expire in 30s, so reconnecting after a long
 * sleep naturally re-authenticates.
 *
 * The realtime URL is a runtime value fetched from `/api/config` (NOT a
 * NEXT_PUBLIC_ build-time var), so the same Docker image works across envs.
 *
 * `socket.io-client` is imported dynamically so it stays out of the SSR bundle
 * and is code-split (only loaded when a user actually starts a battle).
 */

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "unavailable"; // realtime URL not configured

interface RealtimeConfig {
  realtimeUrl: string;
}

interface TicketResponse {
  ticket: string;
  expiresInMs: number;
}

interface ConfigResponse {
  realtimeUrl?: string;
}

type StatusListener = (status: RealtimeConnectionStatus) => void;

let socket: import("socket.io-client").Socket | null = null;
let cachedConfig: RealtimeConfig | null = null;
let activeListener: StatusListener | null = null;

function emitStatus(status: RealtimeConnectionStatus): void {
  activeListener?.(status);
}

async function fetchRealtimeConfig(): Promise<RealtimeConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`/api/config returned ${res.status}`);
  const data = (await res.json()) as ConfigResponse;
  cachedConfig = { realtimeUrl: data.realtimeUrl ?? "" };
  return cachedConfig;
}

async function fetchRealtimeTicket(): Promise<TicketResponse> {
  const res = await fetch("/api/realtime/ticket", { cache: "no-store" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`/api/realtime/ticket returned ${res.status}`);
  return (await res.json()) as TicketResponse;
}

/**
 * Returns the current socket, or null if not connected. Used by the hook to
 * attach event listeners (room/game events wired in later phases).
 */
export function getRealtimeSocket(): import("socket.io-client").Socket | null {
  return socket;
}

/** Whether a realtime connection is currently active. */
export function isRealtimeConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Establishes (or re-uses) the singleton Socket.io connection. Safe to call
 * repeatedly — subsequent calls are no-ops if already connected/connecting.
 *
 * @param onStatus called whenever the connection status changes. Only one
 *   listener is tracked at a time (the latest hook mount wins); this is fine
 *   because the battle store holds the durable state.
 */
export async function connectRealtime(onStatus: StatusListener): Promise<void> {
  activeListener = onStatus;

  // Already connected/connecting — just sync status.
  if (socket) {
    emitStatus(socket.connected ? "connected" : "connecting");
    return;
  }

  let config: RealtimeConfig;
  try {
    config = await fetchRealtimeConfig();
  } catch {
    emitStatus("error");
    throw new Error("Failed to load realtime config");
  }

  if (!config.realtimeUrl) {
    // Multiplayer disabled in this deployment.
    emitStatus("unavailable");
    return;
  }

  emitStatus("connecting");

  const { io } = await import("socket.io-client");
  socket = io(config.realtimeUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    // `auth` as a function is called before EVERY connection attempt (initial
    // + each reconnect), fetching a fresh ticket each time. On fetch failure we
    // send an empty payload so the server rejects with "unauthorized" →
    // connect_error → the reconnection loop retries (and re-fetches).
    auth: (cb) => {
      fetchRealtimeTicket()
        .then(({ ticket }) => cb({ token: ticket }))
        .catch(() => cb({}));
    },
  });

  socket.on("connect", () => emitStatus("connected"));
  socket.on("disconnect", () => emitStatus("disconnected"));
  socket.on("connect_error", () => emitStatus("error"));
  // Note: reconnection attempts keep firing connect_error; the status will flap
  // error->connecting. The hook smooths this for the UI.
}

/**
 * Tears down the singleton connection. Called when the last consumer
 * disconnects (e.g. user leaves the battle flow entirely). Room/lobby cleanup
 * events are emitted by the server on disconnect.
 */
export function disconnectRealtime(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  activeListener = null;
  emitStatus("idle");
}

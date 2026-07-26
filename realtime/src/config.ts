/** Runtime configuration for the realtime server (env-driven). */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`[realtime] Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  /** Port the Socket.io + healthcheck HTTP server listens on. */
  port: parseInt(process.env.REALTIME_PORT || "3001", 10),
  /** Comma-separated list of allowed CORS origins (the Next.js app origin(s)). */
  corsOrigin: (process.env.REALTIME_CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** Shared with the Next.js app — used to verify HMAC-signed auth tickets. */
  authSecret: required("AUTH_SECRET"),
  /** Postgres connection string — used in Phase 4 for word-list fetching. */
  databaseUrl: process.env.DATABASE_URL || "",
  /** TTL of an authenticated session cache entry (ms). */
  sessionCacheTtlMs: 30_000,
  /** Reconnect grace window before a disconnected player is marked DNF (ms). */
  reconnectGraceMs: 15_000,
  /** Empty rooms are destroyed after this idle period (ms). */
  roomIdleTtlMs: 5 * 60_000,
  /** Max concurrently active rooms a single user may host. */
  maxRoomsPerHost: 3,
  /** Max players per room. */
  maxPlayersPerRoom: 35,
  /** Auth ticket lifetime (ms). Tickets are issued by /api/realtime/ticket. */
  ticketTtlMs: 30_000,
} as const;

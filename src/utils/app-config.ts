/**
 * Shared, cached accessor for GET /api/config.
 *
 * Several boot-critical consumers (idle timer, PWA install prompt, class
 * battle poller, realtime client, AI fallback model) each used to fetch
 * /api/config independently — up to 5 identical requests on every page load.
 * This module deduplicates them into a single in-flight request with a short
 * TTL, so independent mount effects still converge on one network round-trip.
 */
export interface AppConfig {
  idleTimeoutMinutes?: number
  pwaInstallPromptEnabled?: boolean
  realtimeUrl?: string
  fallbackModel?: string
}

const CONFIG_TTL_MS = 30_000

let cachedPromise: Promise<AppConfig> | null = null
let cachedAt = 0

export function fetchAppConfig(): Promise<AppConfig> {
  if (cachedPromise && Date.now() - cachedAt < CONFIG_TTL_MS) {
    return cachedPromise
  }
  cachedAt = Date.now()
  cachedPromise = fetch("/api/config", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`/api/config returned ${res.status}`)
      }
      return res.json() as Promise<AppConfig>
    })
    .catch((error: unknown) => {
      // Never cache a failure — let the next consumer retry immediately.
      cachedPromise = null
      cachedAt = 0
      throw error
    })
  return cachedPromise
}

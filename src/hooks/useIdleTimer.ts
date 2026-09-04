"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARNING_MS = 60 * 1000
const CHECK_INTERVAL_MS = 10 * 1000
const THROTTLE_MS = 10 * 1000

// The idle clock must survive scenarios where in-memory refs are not enough:
// - Frozen tabs: locked screens, backgrounded PWAs and throttled/hidden tabs
//   stop the interval entirely. On thaw, the user's first returning gesture
//   (touchstart/mousemove) resets `lastActivityRef` BEFORE the thawed interval
//   can observe the accumulated idle duration — so the timer never fires.
// - Discarded tabs: Chrome Memory Saver and iOS PWA relaunches reload the page
//   with the session cookie intact, losing the in-memory clock completely.
// A localStorage timestamp bridges both, and also reflects activity from other
// tabs of the same browser (activity anywhere keeps every tab alive).
const LAST_ACTIVITY_KEY = "idle-timer:last-activity"

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "keydown",
  "touchstart",
  "click",
  "scroll",
]

function readLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeLastActivity(value: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(value))
  } catch {}
}

function clearLastActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch {}
}

export function useIdleTimer() {
  const { status } = useSession()
  const { t } = useTranslation()
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(DEFAULT_IDLE_TIMEOUT_MS)
  const lastActivityRef = useRef<number>(Date.now())
  const lastBroadcastRef = useRef<number>(0)
  const warnedRef = useRef<boolean>(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  // Snapshot of `lastActivityRef` taken the moment the page became hidden.
  // Judged on the next visibilitychange → visible, BEFORE the returning
  // gesture can reset the clock — this is what makes frozen tabs time out.
  const hiddenSinceRef = useRef<number | null>(null)
  // The last value this tab itself persisted, so a read-back can tell activity
  // from OTHER tabs/page-lives apart from our own writes.
  const lastSelfWriteRef = useRef<number | null>(null)
  const configLoadedRef = useRef(false)
  const bootCheckedRef = useRef(false)
  const signingOutRef = useRef(false)

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.idleTimeoutMinutes) {
          const minutes = Number(data.idleTimeoutMinutes)
          if (Number.isFinite(minutes) && minutes > 0) {
            setIdleTimeoutMs(minutes * 60 * 1000)
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        configLoadedRef.current = true
      })
  }, [])

  const resetWarning = useCallback(() => {
    if (warnedRef.current) {
      warnedRef.current = false
      toast.dismiss("idle-warning")
    }
  }, [])

  const doSignOut = useCallback(async () => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    // Drop the persisted clock so the next sign-in starts fresh, never
    // tripping the boot check on this session's stale idle timestamp.
    clearLastActivity()
    channelRef.current?.postMessage({ type: "signout" })
    try {
      // Sign out through our own authoritative route instead of next-auth's
      // client signOut(): that flow navigates to whatever URL the server
      // returns — on server-side failure it redirects to "/?error=Configuration"
      // WITHOUT deleting the session, leaving the user signed in. This route
      // deletes the session row and clears the cookie, and only a 2xx means
      // success — we never navigate on an unconfirmed sign-out.
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const res = await fetch("/api/auth/idle-timeout", {
        method: "POST",
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        throw new Error(`idle-timeout sign-out failed with HTTP ${res.status}`)
      }
    } catch (e) {
      // Sign-out not confirmed server-side (e.g. iOS suspended network after
      // thaw). Release the guard so the next interval tick retries; stay on
      // the page instead of navigating to a half-signed-out state.
      console.error("[idle-timer] sign-out failed, will retry", e)
      signingOutRef.current = false
      return
    }
    window.location.href = "/"
  }, [])

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    resetWarning()

    const now = Date.now()
    if (now - lastBroadcastRef.current > THROTTLE_MS) {
      lastBroadcastRef.current = now
      channelRef.current?.postMessage({ type: "activity" })
      writeLastActivity(now)
      lastSelfWriteRef.current = now
    }
  }, [resetWarning])

  useEffect(() => {
    if (status === "unauthenticated") {
      // Definitive sign-out (manual, expired, or idle-triggered): release the
      // persisted idle clock so a later sign-in boots clean. While "loading",
      // keep it — the session may still be resolving.
      clearLastActivity()
      return
    }
    if (status !== "authenticated") return

    // Boot check (runs once per page life, after the server config arrives):
    // if the tab was discarded / the PWA relaunched / the page reloaded after
    // a long freeze, the persisted clock tells us the idle limit was already
    // exceeded while this page wasn't running — sign out instead of silently
    // resuming the authenticated session.
    if (!bootCheckedRef.current && configLoadedRef.current) {
      bootCheckedRef.current = true
      const persisted = readLastActivity()
      if (persisted !== null && Date.now() - persisted >= idleTimeoutMs) {
        doSignOut()
        return
      }
    }

    lastActivityRef.current = Date.now()

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel("idle-timer")
    } catch {
      // BroadcastChannel can be unavailable/throw in unusual browser states
      // (e.g. a restored tab). Multi-tab sync is best-effort; degrade gracefully.
      channel = null
    }
    channelRef.current = channel

    if (channel) {
      channel.onmessage = (e: MessageEvent) => {
        if (e.data?.type === "activity") {
          lastActivityRef.current = Date.now()
          resetWarning()
          // Another tab is keeping the session alive while we're hidden; keep
          // the hide snapshot fresh so thawing doesn't misjudge the idle time.
          if (
            document.visibilityState === "hidden" &&
            hiddenSinceRef.current !== null
          ) {
            hiddenSinceRef.current = Date.now()
          }
        } else if (e.data?.type === "signout") {
          doSignOut()
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Snapshot and persist the idle clock before the tab freezes. A
        // frozen tab cannot run any code, so this write is the only record
        // of when the user was last active.
        hiddenSinceRef.current = lastActivityRef.current
        writeLastActivity(lastActivityRef.current)
        lastSelfWriteRef.current = lastActivityRef.current
        return
      }

      const hiddenSince = hiddenSinceRef.current
      hiddenSinceRef.current = null
      if (hiddenSince === null) return

      // The tab is thawing. The user's returning gesture may already have
      // reset `lastActivityRef` (and re-persisted it) before this handler
      // ran, so judge idleness from the hide-time snapshot plus any clock
      // value persisted by OTHER tabs while we were frozen — never from our
      // own post-thaw writes.
      const persisted = readLastActivity()
      const external =
        persisted !== null && persisted !== lastSelfWriteRef.current
          ? persisted
          : 0
      const effectiveLast = Math.max(hiddenSince, external)
      lastActivityRef.current = Math.max(lastActivityRef.current, effectiveLast)
      if (Date.now() - effectiveLast >= idleTimeoutMs) {
        doSignOut()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const throttledHandler = (() => {
      let lastCall = 0
      return () => {
        const now = Date.now()
        if (now - lastCall > THROTTLE_MS) {
          lastCall = now
          recordActivity()
        }
      }
    })()

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true })
    })

    const interval = setInterval(() => {
      const idleDuration = Date.now() - lastActivityRef.current

      if (!warnedRef.current && idleDuration >= idleTimeoutMs - WARNING_MS) {
        warnedRef.current = true
        toast.warning(t("idle.warning"), {
          id: "idle-warning",
          duration: WARNING_MS,
        })
      }

      if (idleDuration >= idleTimeoutMs) {
        doSignOut()
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, throttledHandler)
      })
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
      channel?.close()
      channelRef.current = null
      hiddenSinceRef.current = null
      toast.dismiss("idle-warning")
    }
  }, [status, idleTimeoutMs, t, recordActivity, resetWarning, doSignOut])
}

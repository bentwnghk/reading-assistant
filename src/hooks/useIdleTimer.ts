"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARNING_MS = 60 * 1000
const CHECK_INTERVAL_MS = 10 * 1000
const THROTTLE_MS = 10 * 1000
// After this many consecutive failed sign-out POSTs (~1 minute of retries),
// fall back to a plain top-level navigation to the route's GET variant,
// which performs the same deletion server-side and redirects to "/".
const MAX_SIGNOUT_ATTEMPTS = 6

// The idle clock must survive scenarios where in-memory refs are not enough:
// - Frozen pages: locked screens, backgrounded PWAs and throttled/frozen tabs
//   stop the interval entirely. On thaw, the user's first returning gesture
//   (touchstart/mousemove) can reset `lastActivityRef` BEFORE the thawed
//   interval observes the accumulated idle duration — so the timer never
//   fires. Screen lock on desktop does not even fire `visibilitychange`,
//   and iOS does not fire it reliably for PWAs, so lifecycle events alone
//   cannot be trusted.
// - Discarded tabs: Chrome Memory Saver and iOS PWA relaunches reload the
//   page with the session cookie intact, losing the in-memory clock.
// A localStorage timestamp bridges both, and also reflects activity from
// other tabs of the same browser (activity anywhere keeps every tab alive).
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
  // Mirror so stable callbacks (created once) always read the latest value.
  const idleTimeoutMsRef = useRef(DEFAULT_IDLE_TIMEOUT_MS)
  // 0 = not armed yet (signed out / not initialized). The effect NEVER
  // rewrites a non-zero value — re-renders must not reset the idle clock.
  const lastActivityRef = useRef<number>(0)
  const lastBroadcastRef = useRef<number>(0)
  const warnedRef = useRef<boolean>(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const signingOutRef = useRef(false)
  const signOutAttemptsRef = useRef(0)
  const bootHandledRef = useRef(false)

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const minutes = Number(data.idleTimeoutMinutes)
        if (Number.isFinite(minutes) && minutes > 0) {
          idleTimeoutMsRef.current = minutes * 60 * 1000
          setIdleTimeoutMs(minutes * 60 * 1000)
        }
      })
      .catch(() => {})
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
    // tripping on this session's stale idle timestamp.
    clearLastActivity()
    channelRef.current?.postMessage({ type: "signout" })
    // Fire-and-forget beacon first: the browser queues beacons even from
    // frozen/backgrounded pages where a fetch may never be sent.
    try {
      navigator.sendBeacon?.("/api/auth/idle-timeout")
    } catch {}
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
      // Sign-out not confirmed server-side (e.g. network asleep while the
      // device was locked). Release the guard so the next interval tick
      // retries; stay on the page instead of navigating to a
      // half-signed-out state.
      console.error("[idle-timer] sign-out failed, will retry", e)
      signingOutRef.current = false
      signOutAttemptsRef.current += 1
      if (signOutAttemptsRef.current >= MAX_SIGNOUT_ATTEMPTS) {
        // Last resort: a top-level navigation, the most reliable request a
        // throttled/suspended page can make. The GET variant performs the
        // same deletion and redirects to "/".
        window.location.href = "/api/auth/idle-timeout"
      }
      return
    }
    window.location.href = "/"
  }, [])

  const recordActivity = useCallback(() => {
    const now = Date.now()
    const previous = lastActivityRef.current
    // Self-defending clock: if the PREVIOUS clock value is already past the
    // idle limit, this gesture is a return from too-long idle (the page was
    // frozen — locked screen, suspended PWA, frozen tab — so the interval
    // never got to fire, or its sign-out retries never completed). Sign out
    // instead of resetting the clock. This is what makes the timer immune
    // to the gesture-races that lifecycle events cannot reliably cover.
    if (previous > 0 && now - previous >= idleTimeoutMsRef.current) {
      doSignOut()
      return
    }
    lastActivityRef.current = now
    resetWarning()

    if (now - lastBroadcastRef.current > THROTTLE_MS) {
      lastBroadcastRef.current = now
      channelRef.current?.postMessage({ type: "activity" })
      writeLastActivity(now)
    }
  }, [doSignOut, resetWarning])

  useEffect(() => {
    if (status === "unauthenticated") {
      // Definitive sign-out (manual, expired, or idle-triggered): release
      // the idle clock so a later sign-in starts fresh.
      lastActivityRef.current = 0
      clearLastActivity()
      return
    }
    if (status !== "authenticated") return

    // Arm the clock exactly once per signed-in page life, resuming from the
    // persisted clock when one exists: after a tab discard / PWA relaunch
    // mid-idle, the true idle duration carries over — if it is already past
    // the limit, the first interval tick signs out (and keeps retrying on
    // failure). Effect re-runs (config load, re-renders) must never rewrite
    // an armed clock.
    if (!bootHandledRef.current) {
      bootHandledRef.current = true
      const persisted = readLastActivity()
      if (persisted !== null && persisted < Date.now()) {
        lastActivityRef.current = persisted
      }
    }
    if (lastActivityRef.current === 0) {
      lastActivityRef.current = Date.now()
    }

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
          // Another tab is active; keep this tab's clock fresh so activity
          // anywhere keeps every tab alive. (Judged against the timeout the
          // same way — a stale incoming clock is impossible: the sender
          // only broadcasts fresh activity.)
          lastActivityRef.current = Date.now()
          resetWarning()
        } else if (e.data?.type === "signout") {
          doSignOut()
        }
      }
    }

    // Persist the clock whenever the page is about to be hidden or frozen.
    // A frozen page cannot run any code, so these writes are the only record
    // of when the user was last active if the page is discarded / the PWA
    // relaunches. `pagehide` is the reliable event on iOS; `visibilitychange`
    // covers desktop browsers.
    const persistClock = () => {
      if (lastActivityRef.current > 0) {
        writeLastActivity(lastActivityRef.current)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistClock()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", persistClock)

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
      // Judge against the freshest of this tab's in-memory clock and the
      // persisted clock (written by this tab on hide and by other tabs on
      // their activity). The persisted half also covers a page that was
      // discarded and reloaded mid-idle: the first tick after boot already
      // sees the true idle duration.
      const persisted = readLastActivity() ?? 0
      const idleDuration = Date.now() - Math.max(lastActivityRef.current, persisted)

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
      window.removeEventListener("pagehide", persistClock)
      clearInterval(interval)
      channel?.close()
      channelRef.current = null
      toast.dismiss("idle-warning")
    }
  }, [status, idleTimeoutMs, t, recordActivity, resetWarning, doSignOut])
}

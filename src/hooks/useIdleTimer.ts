"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARNING_MS = 60 * 1000
const CHECK_INTERVAL_MS = 10 * 1000
const THROTTLE_MS = 10 * 1000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "keydown",
  "touchstart",
  "click",
  "scroll",
]

export function useIdleTimer() {
  const { status } = useSession()
  const { t } = useTranslation()
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(DEFAULT_IDLE_TIMEOUT_MS)
  const lastActivityRef = useRef<number>(Date.now())
  const lastBroadcastRef = useRef<number>(0)
  const warnedRef = useRef<boolean>(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.idleTimeoutMinutes) {
          setIdleTimeoutMs(data.idleTimeoutMinutes * 60 * 1000)
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

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    resetWarning()

    const now = Date.now()
    if (now - lastBroadcastRef.current > THROTTLE_MS && channelRef.current) {
      lastBroadcastRef.current = now
      channelRef.current.postMessage({ type: "activity" })
    }
  }, [resetWarning])

  useEffect(() => {
    if (status !== "authenticated") return

    lastActivityRef.current = Date.now()

    const channel = new BroadcastChannel("idle-timer")
    channelRef.current = channel

    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "activity") {
        lastActivityRef.current = Date.now()
        resetWarning()
      } else if (e.data?.type === "signout") {
        signOut({ callbackUrl: "/" })
      }
    }

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
        channel.postMessage({ type: "signout" })
        signOut({ callbackUrl: "/" })
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, throttledHandler)
      })
      clearInterval(interval)
      channel.close()
      channelRef.current = null
      toast.dismiss("idle-warning")
    }
  }, [status, idleTimeoutMs, t, recordActivity, resetWarning])
}

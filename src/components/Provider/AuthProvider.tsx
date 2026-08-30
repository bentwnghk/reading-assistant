"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { setUserId, useReadingStore, setRestoreComplete, setWelcomeDialogChecked } from "@/store/reading"
import { setAuthState } from "@/store/history"
import {
  setSettingUserId,
  loadSettingsFromAPI,
  markLastOpenedSession,
  useSettingStore,
  defaultValues,
  enforceRestrictedModels,
} from "@/store/setting"

import { useHistoryStore } from "@/store/history"
import { initAchievementCallbacks } from "@/store/achievements"
import { useSharingStore, setShareCheckComplete } from "@/store/sharing"
import { useVocabularyStore, setStudyPlanDialogChecked } from "@/store/vocabulary"
import { useIdleTimer } from "@/hooks/useIdleTimer"

function AuthStateManager() {
  const { data: session, status } = useSession()
  const { t } = useTranslation()
  const syncedUserIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    initAchievementCallbacks()
  }, [])
  
  useEffect(() => {
    const isAuthenticated = status === "authenticated"
    const userId = session?.user?.id || null

    setUserId(userId)
    setAuthState(isAuthenticated, userId)
    setSettingUserId(userId)

    let ticketInterval: ReturnType<typeof setInterval> | null = null
    const cleanup = () => {
      if (ticketInterval) clearInterval(ticketInterval)
    }

    if (!isAuthenticated || !userId) {
      syncedUserIdRef.current = null
      setRestoreComplete(false)
      setShareCheckComplete(false)
      setWelcomeDialogChecked(false)
      setStudyPlanDialogChecked(false)
      const currentLanguage = useSettingStore.getState().language
      useSettingStore.getState().loadFromServer({ ...defaultValues, language: currentLanguage })
      // Only release the first-run UI gate on a definitive sign-out. While the
      // session is still "loading", keep it closed — a whitelisted user's
      // free-access flag isn't known until the sign-in sequence settles.
      if (status === "unauthenticated") {
        useSettingStore.setState({ authDataLoaded: true })
      }
      return cleanup
    }

    // Refresh the identity-bound free-access ticket cookie (24h TTL) so
    // long-lived SPA sessions keep a valid ticket. granted=false also clears
    // stale tickets for users removed from FREE_ACCESS_EMAILS.
    const refreshFreeAccessFlag = async (): Promise<boolean> => {
      try {
        const response = await fetch("/api/free-access/ticket")
        if (!response.ok) return false
        const data = (await response.json()) as { granted?: boolean }
        return !!data.granted
      } catch {
        return false
      }
    }

    ticketInterval = setInterval(() => {
      refreshFreeAccessFlag().then((granted) => {
        if (syncedUserIdRef.current === userId) {
          useSettingStore.setState({ freeAccessGranted: granted })
        }
      })
    }, 6 * 60 * 60 * 1000)

    if (syncedUserIdRef.current === userId) {
      return cleanup
    }

    syncedUserIdRef.current = userId
    const expectedUserId = userId

    // Hold the first-run UI gate (onboarding dialog, settings banner) closed
    // until this user's sign-in data — including the free-access ticket
    // result — has settled, so whitelisted users never see a setup flash.
    useSettingStore.setState({ authDataLoaded: false })

    const preSignInLanguage = useSettingStore.getState().language

    const sessionsPromise = useHistoryStore.getState().loadFromAPI?.() ?? Promise.resolve([])
    const settingsPromise = loadSettingsFromAPI()
    const ticketPromise = refreshFreeAccessFlag()

    Promise.all([sessionsPromise, settingsPromise, ticketPromise]).then(([sessions, settings, freeAccessGranted]) => {
        if (syncedUserIdRef.current !== expectedUserId) {
          return
        }

        if (settings && Object.keys(settings).length > 0) {
          useSettingStore.getState().loadFromServer(settings)
        } else {
          useSettingStore.getState().update({ language: preSignInLanguage })
        }

        // Applied after loadFromServer (which resets it to the default) so
        // the server settings merge can't clobber the live ticket state.
        // authDataLoaded releases the first-run UI gate in the same tick.
        useSettingStore.setState({ freeAccessGranted, authDataLoaded: true })

        // Reset restricted model selections (persisted server-side or in
        // hydrated localStorage) back to defaults for non-privileged users.
        // The corrected values sync back to the server via debounced update().
        enforceRestrictedModels(session?.user?.role)

        const currentReading = useReadingStore.getState()
        const hasActiveSession = Boolean(currentReading.id && currentReading.extractedText)

        if (hasActiveSession) {
          markLastOpenedSession(currentReading.id)
          setRestoreComplete(true)
        } else if (sessions.length > 0) {
          const preferredSessionId = settings?.lastOpenedSessionId
          const sessionToRestore =
            sessions.find((item) => item.id === preferredSessionId) ?? sessions[0]

          if (sessionToRestore) {
            // Restore the lightweight session immediately so the UI (and the
            // "Welcome back!" dialog) is not blocked on a network request. The
            // session list omits originalImages/visualizationImage for speed.
            useReadingStore.getState().restore(sessionToRestore)
            markLastOpenedSession(sessionToRestore.id)

            const sessionTitle =
              sessionToRestore.docTitle ||
              sessionToRestore.extractedText.slice(0, 40) ||
              sessionToRestore.id
            toast.message(t("history.restored", { title: sessionTitle }))

            // Then fetch the full session (with media) in the background and
            // merge only the missing media fields, so any quick user edits to
            // text content are not overwritten.
            fetch(`/api/sessions/${sessionToRestore.id}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((fullData) => {
                if (!fullData) return
                if (syncedUserIdRef.current !== expectedUserId) return
                // Only merge if the user hasn't switched to another session.
                if (useReadingStore.getState().id !== sessionToRestore.id) return
                useReadingStore.setState({
                  originalImages: fullData.originalImages ?? [],
                  visualizationImage: fullData.visualizationImage ?? "",
                })
                useHistoryStore.getState().hydrate(sessionToRestore.id, fullData)
              })
              .catch(() => {})
          }
        }

        setRestoreComplete(true)

        const sessionSharePromise = useSharingStore.getState().fetchPendingCount().then((count) => {
          if (count > 0) {
            useSharingStore.getState().setShowSharedDialog(true)
          }
        })
        const reviewListSharePromise = useVocabularyStore.getState().fetchPendingReviewListShareCount().then((count) => {
          if (count > 0) {
            useVocabularyStore.getState().setShowReviewListShareDialog(true)
          }
        })

        Promise.all([sessionSharePromise, reviewListSharePromise]).finally(() => {
          setShareCheckComplete(true)
        })
      })

    return cleanup
  }, [session?.user?.id, session?.user?.role, status, t])
  
  return null
}

function IdleTimer() {
  useIdleTimer()
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthStateManager />
      <IdleTimer />
      {children}
    </SessionProvider>
  )
}

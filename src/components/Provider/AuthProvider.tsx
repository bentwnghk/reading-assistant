"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { setUserId, useReadingStore, setRestoreComplete, setWelcomeDialogChecked, setPendingFullHydration, clearPendingFullHydration } from "@/store/reading"
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

    // A different user is signing in: close both first-run gates until THIS
    // user's restore + share checks settle, so stale counts never leak across
    // account switches.
    setRestoreComplete(false)
    setShareCheckComplete(false)

    // Hold the first-run UI gate (onboarding dialog, settings banner) closed
    // until this user's sign-in data — including the free-access ticket
    // result — has settled, so whitelisted users never see a setup flash.
    useSettingStore.setState({ authDataLoaded: false })

    const preSignInLanguage = useSettingStore.getState().language

    const sessionsPromise = useHistoryStore.getState().loadFromAPI?.() ?? Promise.resolve([])
    const settingsPromise = loadSettingsFromAPI()
    const ticketPromise = refreshFreeAccessFlag()

    // The share-count checks have no dependency on the results above — fire
    // them in the SAME wave instead of chaining a second round-trip
    // generation behind Promise.all. The first-paint gate in page.tsx waits
    // for both restore AND share checks, so serializing them added a full
    // network round-trip to every sign-in for nothing.
    const sessionSharePromise = useSharingStore.getState().fetchPendingCount().then((count) => {
      if (count > 0 && syncedUserIdRef.current === expectedUserId) {
        useSharingStore.getState().setShowSharedDialog(true)
      }
    })
    const reviewListSharePromise = useVocabularyStore.getState().fetchPendingReviewListShareCount().then((count) => {
      if (count > 0 && syncedUserIdRef.current === expectedUserId) {
        useVocabularyStore.getState().setShowReviewListShareDialog(true)
      }
    })

    Promise.all([sessionSharePromise, reviewListSharePromise]).finally(() => {
      if (syncedUserIdRef.current === expectedUserId) {
        setShareCheckComplete(true)
      }
    })

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
          const inList = preferredSessionId
            ? sessions.find((item) => item.id === preferredSessionId)
            : undefined

          // Restores a lightweight list entry immediately (UI + "Welcome
          // back!" dialog are never blocked on a network request), then
          // hydrates the fields the list response strips for speed (media +
          // heavy per-session JSONB) from /api/sessions/[id] in the
          // background. While hydration is pending, history writes are
          // suppressed (see isPendingFullHydration in store/reading.ts).
          const restoreLightweight = (sessionToRestore: (typeof sessions)[number]) => {
            useReadingStore.getState().restore(sessionToRestore)
            setPendingFullHydration(sessionToRestore.id)
            markLastOpenedSession(sessionToRestore.id)

            const sessionTitle =
              sessionToRestore.docTitle ||
              sessionToRestore.extractedText.slice(0, 40) ||
              sessionToRestore.id
            toast.message(t("history.restored", { title: sessionTitle }))

            fetch(`/api/sessions/${sessionToRestore.id}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((fullData) => {
                if (syncedUserIdRef.current !== expectedUserId) {
                  clearPendingFullHydration(sessionToRestore.id)
                  return
                }
                // Only merge if the user hasn't switched to another session.
                if (useReadingStore.getState().id !== sessionToRestore.id) {
                  clearPendingFullHydration(sessionToRestore.id)
                  return
                }
                if (!fullData) {
                  // Fetch failed: release the history-write gate anyway so
                  // the session keeps autosaving. The (already lightweight)
                  // entry simply stays un-hydrated and loadFull retries.
                  clearPendingFullHydration(sessionToRestore.id)
                  return
                }
                // Merge only the fields missing from the lightweight entry,
                // and never overwrite a field the user may have already
                // populated during the fetch window (merge-if-still-default).
                const current = useReadingStore.getState()
                useReadingStore.setState({
                  originalImages: fullData.originalImages ?? [],
                  visualizationImage: fullData.visualizationImage ?? "",
                  readingTest: current.readingTest.length ? current.readingTest : fullData.readingTest ?? [],
                  grammarQuiz: current.grammarQuiz.length ? current.grammarQuiz : fullData.grammarQuiz ?? [],
                  vocabularyQuiz: current.vocabularyQuiz.length ? current.vocabularyQuiz : fullData.vocabularyQuiz ?? [],
                  spellingResults: current.spellingResults.length ? current.spellingResults : fullData.spellingResults ?? [],
                  grammarResults: current.grammarResults.length ? current.grammarResults : fullData.grammarResults ?? [],
                  grammarErrorChallenges: current.grammarErrorChallenges.length
                    ? current.grammarErrorChallenges
                    : fullData.grammarErrorChallenges ?? [],
                  grammarScrambleChallenges: current.grammarScrambleChallenges.length
                    ? current.grammarScrambleChallenges
                    : fullData.grammarScrambleChallenges ?? [],
                  grammarWorkshopChallenges: current.grammarWorkshopChallenges.length
                    ? current.grammarWorkshopChallenges
                    : fullData.grammarWorkshopChallenges ?? [],
                  grammarGameQuestions: current.grammarGameQuestions.length
                    ? current.grammarGameQuestions
                    : fullData.grammarGameQuestions ?? [],
                })
                clearPendingFullHydration(sessionToRestore.id)
                useHistoryStore.getState().hydrate(sessionToRestore.id, fullData)
              })
              .catch(() => {
                clearPendingFullHydration(sessionToRestore.id)
              })
          }

          if (preferredSessionId && !inList) {
            // The preferred (last opened) session exists but fell outside the
            // list query's recency cap — fetch it directly instead of silently
            // restoring the wrong (most recent) session. The [id] response is
            // complete, so no background hydration is needed.
            fetch(`/api/sessions/${preferredSessionId}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((full) => {
                if (syncedUserIdRef.current !== expectedUserId) return
                if (full) {
                  useReadingStore.getState().restore(full)
                  markLastOpenedSession(full.id)
                  const sessionTitle =
                    full.docTitle || full.extractedText?.slice(0, 40) || full.id
                  toast.message(t("history.restored", { title: sessionTitle }))
                } else {
                  // Preferred session no longer exists — fall back to newest.
                  restoreLightweight(sessions[0])
                }
              })
              .catch(() => restoreLightweight(sessions[0]))
          } else {
            restoreLightweight(inList ?? sessions[0])
          }
        }

        setRestoreComplete(true)
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

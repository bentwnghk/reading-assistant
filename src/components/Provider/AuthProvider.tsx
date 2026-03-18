"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { setUserId, useReadingStore } from "@/store/reading"
import { setAuthState } from "@/store/history"
import {
  setSettingUserId,
  loadSettingsFromAPI,
  markLastOpenedSession,
  useSettingStore,
  defaultValues,
} from "@/store/setting"

import { useHistoryStore } from "@/store/history"
import { initAchievementCallbacks } from "@/store/achievements"

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

    if (!isAuthenticated || !userId) {
      syncedUserIdRef.current = null
      // Reset in-memory settings back to defaults so a logged-out (or
      // different) user doesn't see the previous authenticated user's data.
      // Preserve the user's language preference from localStorage.
      const currentLanguage = useSettingStore.getState().language
      useSettingStore.getState().loadFromServer({ ...defaultValues, language: currentLanguage })
      return
    }

    if (syncedUserIdRef.current === userId) {
      return
    }

    syncedUserIdRef.current = userId
    const expectedUserId = userId
    
    const preSignInLanguage = useSettingStore.getState().language

    const sessionsPromise = useHistoryStore.getState().loadFromAPI?.() ?? Promise.resolve([])
    const settingsPromise = loadSettingsFromAPI()

    Promise.all([sessionsPromise, settingsPromise]).then(([sessions, settings]) => {
        if (syncedUserIdRef.current !== expectedUserId) {
          return
        }

        if (settings && Object.keys(settings).length > 0) {
          useSettingStore.getState().loadFromServer(settings)
        } else {
          useSettingStore.getState().update({ language: preSignInLanguage })
        }

        const currentReading = useReadingStore.getState()
        const hasActiveSession = Boolean(currentReading.id && currentReading.extractedText)

        if (hasActiveSession) {
          markLastOpenedSession(currentReading.id)
          return
        }

        if (sessions.length === 0) {
          return
        }

        const preferredSessionId = settings?.lastOpenedSessionId
        const sessionToRestore =
          sessions.find((item) => item.id === preferredSessionId) ?? sessions[0]

        if (sessionToRestore) {
          useReadingStore.getState().restore(sessionToRestore)
          markLastOpenedSession(sessionToRestore.id)

          const sessionTitle =
            sessionToRestore.docTitle ||
            sessionToRestore.extractedText.slice(0, 40) ||
            sessionToRestore.id
          toast.message(t("history.restored", { title: sessionTitle }))
        }
      })
  }, [session?.user?.id, status, t])
  
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthStateManager />
      {children}
    </SessionProvider>
  )
}

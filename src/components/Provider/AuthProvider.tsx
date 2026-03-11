"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect } from "react"
import { setUserId } from "@/store/reading"
import { setAuthState } from "@/store/history"
import { setSettingUserId, loadSettingsFromAPI, useSettingStore } from "@/store/setting"

import { useHistoryStore } from "@/store/history"

function AuthStateManager() {
  const { data: session, status } = useSession()
  
  useEffect(() => {
    const isAuthenticated = status === "authenticated"
    const userId = session?.user?.id || null
    
    setUserId(userId)
    setAuthState(isAuthenticated, userId)
    setSettingUserId(userId)
    
    if (isAuthenticated && userId) {
      useHistoryStore.getState().loadFromAPI?.()
      loadSettingsFromAPI().then((settings) => {
        if (settings && Object.keys(settings).length > 0) {
          useSettingStore.getState().loadFromServer(settings)
        }
      })
    }
  }, [session, status])
  
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

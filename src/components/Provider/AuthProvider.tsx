"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect } from "react"
import { setUserId } from "@/store/reading"
import { setAuthState } from "@/store/history"

import { useHistoryStore } from "@/store/history"

function AuthStateManager() {
  const { data: session, status } = useSession()
  
  useEffect(() => {
    const isAuthenticated = status === "authenticated"
    const userId = session?.user?.id || null
    
    setUserId(userId)
    setAuthState(isAuthenticated, userId)
    
    if (isAuthenticated && userId) {
      useHistoryStore.getState().loadFromAPI?.()
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

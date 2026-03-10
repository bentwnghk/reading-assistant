"use client"

import { useEffect } from "react"
import { useHistoryStore } from "@/store/history"
import { useSession } from "next-auth/react"

export function SessionList() {
  const { status } = useSession()
  const { loadFromAPI } = useHistoryStore()

  useEffect(() => {
    if (status === "authenticated" && loadFromAPI) {
      loadFromAPI()
    }
  }, [status, loadFromAPI])

  return null
}
